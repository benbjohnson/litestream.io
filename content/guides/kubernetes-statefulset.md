---
title : "Running as a sidecar container in a Kubernetes StatefulSet"
date: 2021-03-08T00:00:00Z
layout: docs
menu:
  docs:
    parent: "guides"
weight: 320
---

This guide will get you running Litestream as a sidecar container in a Kubernetes StatefulSet, alongside your existing application using SQLite. This means that as long as your application is running, so will Litestream. It assumes you already have a Kubernetes [StatefulSet](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/) and that your SQLite database is stored on a [Volume](https://kubernetes.io/docs/concepts/storage/volumes/).

{{< alert icon="⏱" text="This should take approximately 20 minutes to complete." >}}


## Prerequisites

This guide assumes you have read the [_Getting Started_](/getting-started)
tutorial already. Please read that to understand the basic operation of Litestream.


### Creating an S3 bucket

If you don't already have an Amazon AWS account, you can go 
[https://aws.amazon.com/](https://aws.amazon.com/) and click "Create Account".
Once you have an account, you'll need to [create an AWS IAM user][iam] with
_programmatic access_ and with `AmazonS3FullAccess` permissions. After creating
the user, you should have an **access key id** and a **secret access key**. We
will use those in one of the steps below.

You'll also need to create a bucket in AWS S3. You'll need to create a unique
name for your bucket. In this guide, we'll name our bucket
`"mybkt.litestream.io"` but replace that with your bucket name in the examples
below.

If you are running your Kubernetes cluster in AWS you might chose to use an IAM Role instead and a tool like [kiam](https://github.com/uswitch/kiam), [kube2iam](https://github.com/jtblin/kube2iam) or the [IAM Roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html) feature of EKS. This will work just fine with Litestream, but for the sake of simplicity this guide will focus on IAM Users.

[iam]: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html


## Kubernetes Secret for AWS Credentials

You must provide Litestream with the credentials for your AWS IAM User somehow. The best way built into Kubernetes is to use [Secrets](https://kubernetes.io/docs/concepts/configuration/secret/).

To create a secret you can run a kubectl command like:

```sh
kubectl create secret generic litestream --from-literal=AWS_ACCESS_KEY_ID="my-access-key-id" --from-literal=AWS_SECRET_ACCESS_KEY="my-secret-access-key"
```


## Kubernetes ConfigMap for Litestream configuration

When running as a sidecar container, we'll configure Litestream using a
[configuration file](/reference/config) and store it in a Kubernetes [ConfigMap](https://kubernetes.io/docs/concepts/configuration/configmap/).

Litestream monitors one or more _databases_ and each of those databases
replicates to one or more _replicas_. First, we'll create a basic configuration
file; save it as `litestream.yml`.

This assumes your application stores its SQLite database in the root of your Persistent Volume and it is called `db.db`.

```yaml
addr: ":9090"
dbs:
  - path: /db/db.db
    replicas:
      - url: s3://mybkt.litestream.io/db.db
        region: us-east-1

```

This configuration specifies that we want want Litestream to monitor our
`db.db` database in a directory called `db` (where we have mounted the Persistent Volume) and continuously replicate it to
our `mybkt.litestream.io` S3 bucket. We've also enabled the metrics endpoint which will come in useful if you want to monitor LiteStream with Prometheus.

After changing our configuration, we'll need to save it as a ConfigMap:

```sh
kubectl create configmap litestream --from-file=litestream.yml
```


## Adding Litestream to our StatefulSet

Now that we've got our ConfigMap and Secret set up for Litestream to use, we need to add an additional container to the Pod created by our StatefulSet. Due to the limitations of SQLite and Litestream, your StatefulSet should be set up to only create a single Pod.


### Volumes

There are two volumes Litestream is going to need; one for the configuration file and one for your SQLite database.

Set up the volume for your Pod like this:

```yaml
volumes:
  - name: litestream
    configMap:
      name: litestream
```

You should also have a volumeClaimTemplate for the Persistent Volume storing your SQLite database in your StatefulSet like this:

```yaml
volumeClaimTemplates:
- metadata:
    name: database
  spec:
    accessModes: ["ReadWriteOnce"]
    resources:
      requests:
        storage: 100Mi
```


### The Litestream Container

Now everything else is set up you can add an extra entry to the `containers` section of your StatefulSet configuration like this:

```yaml
- name: litestream
  image: litestream/litestream:0.3.3
  volumeMounts:
  - name: database
    mountPath: /db
  - name: litestream
    mountPath: /etc/litestream.yml
    subPath: litestream.yml
  env:
  - name: AWS_ACCESS_KEY_ID
    valueFrom:
      secretKeyRef:
        name: litestream
        key: AWS_ACCESS_KEY_ID
  - name: AWS_SECRET_ACCESS_KEY
    valueFrom:
      secretKeyRef:
        name: litestream
        key: AWS_SECRET_ACCESS_KEY
  args:
  - replicate
  ports:
  - name: metrics
    containerPort: 9090
```

This configuration:

* Pulls the Litestream container image from Docker Hub
* Mounts the database Persistent Volume to `/db` in the container
* Mounts the `litestream.yml` file in your ConfigMap to `/etc/litestream.yml` in the container
* Gets your AWS credentials from the Secret and exposes them to Litestream as environment variables
* Runs the Litestream [replicate](/reference/replicate/) command
* Exposes the metrics endpoint on port 9090

After applying this configuration you should be able to see Litestream start up by tailing the logs:

```sh
kubectl logs -f -c litestream wordpress-0
```

## Simulating a disaster

...


## Restoring our database


...

## Further reading

You now have a production-ready replication setup using SQLite and Litestream.
Please see the [Reference](/reference) section for more configuration options.

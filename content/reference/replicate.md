---
title : "Command: replicate"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 530
---

The `replicate` command starts a server to monitor & continuously replicate
SQLite databases. You can specify your database & replica in a configuration
file or you can replicate a single database file by specifying its path and its
replica in the command line arguments.


## Usage

### Using a configuration file

This command format will read all options from the configuration file. This
is the recommended approach for production systems.

```
litestream replicate [arguments]
```


### Replicate a single file (Command-line mode)

This command format sets up replication for a single database file `DB_PATH`
to a single replica URL without a configuration file. {{< since version="0.5.0" >}} Multiple replicas per database are no longer supported in command-line mode.
Credentials must be passed via environment variables.

```
litestream replicate [arguments] DB_PATH REPLICA_URL
```

#### When to use command-line mode

Command-line mode is convenient for:
- Simple deployments with a single database
- Development and testing
- Container environments where you prefer environment variables over config files
- CI/CD pipelines with dynamically generated credentials

**Not recommended for production** because:
- Only supports a single database (use config file for multiple databases)
- Limited configuration options (no retention tuning, snapshot intervals, etc.)
- All configuration is command-line only (harder to track in version control)
- Config file mode offers better operational visibility

#### Command-line mode examples

**Basic S3 replication:**

```bash
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
litestream replicate /var/lib/mydb.db s3://mybucket/mydb
```

**With Litestream-specific AWS credentials:**

```bash
export LITESTREAM_ACCESS_KEY_ID=your-access-key
export LITESTREAM_SECRET_ACCESS_KEY=your-secret-key
litestream replicate /var/lib/mydb.db s3://mybucket/mydb
```

**Google Cloud Storage with Application Default Credentials:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
litestream replicate /var/lib/mydb.db gs://mybucket/mydb
```

**Azure Blob Storage:**

```bash
export LITESTREAM_AZURE_ACCOUNT_KEY=your-account-key
litestream replicate /var/lib/mydb.db abs://account@myaccount.blob.core.windows.net/container/mydb
```

**Kubernetes with secret injection:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: AWS_ACCESS_KEY_ID
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: access-key-id
    - name: AWS_SECRET_ACCESS_KEY
      valueFrom:
        secretKeyRef:
          name: aws-credentials
          key: secret-access-key
    - name: LITESTREAM_REPLICA_URL
      value: s3://mybucket/mydb
    - name: DATABASE_PATH
      value: /data/mydb.db
    command:
    - sh
    - -c
    - "litestream replicate $DATABASE_PATH $LITESTREAM_REPLICA_URL & exec myapp"
```

#### Configuration file mode vs command-line mode

| Feature | Config File | Command-line |
|---------|-------------|--------------|
| **Recommended for** | Production | Development/Testing |
| **Number of databases** | Multiple | Single only |
| **Retention configuration** | Full control | Not supported |
| **Snapshot intervals** | Customizable | Default only |
| **Metrics endpoint** | Configurable | Not supported |
| **Multiple replicas per DB** | Single replica | Not supported |
| **Credential management** | File + env vars | Environment variables only |
| **Operability** | Excellent | Limited |
| **Restart behavior** | Persistent config | Command-line only |

#### Passing credentials to command-line mode

Command-line mode **only** supports authentication via environment variables.
You cannot embed credentials in the replica URL for security reasons.

```bash
# ✓ Correct: Credentials via environment variables
export AWS_ACCESS_KEY_ID=key
litestream replicate /var/lib/db.db s3://bucket/db

# ✗ Wrong: Credentials in URL won't work
litestream replicate /var/lib/db.db s3://key:secret@bucket/db
```

For complex deployments with multiple databases or advanced configuration,
use a [configuration file]({{< ref "config" >}}) instead.


## Arguments

```
-config PATH
    Specifies the configuration file.
    Defaults to /etc/litestream.yml

-exec CMD
    Executes a subcommand. Litestream will exit when the child
    process exits. Useful for simple process management.

-no-expand-env
    Disables environment variable expansion in configuration file.
```

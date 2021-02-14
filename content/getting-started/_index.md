---
title : "Getting Started"
date: 2021-02-01T00:00:00Z
layout: docs
---

This tutorial will get you up and running with Litestream locally and
replicating a SQLite database to Amazon S3. By the end, you'll understand the
`replicate` and `restore` commands and be able to continuously backup your
database. It assumes you're comfortable on the command line and have some basic
familiarity with Amazon AWS.

{{< alert icon="⏱" text="You should expect this tutorial to take about 10 minutes." >}}


## Prerequisites

### Install Litestream & SQLite

Before continuing, [please install Litestream on your local machine](/install).

You will also need [SQLite](https://sqlite.org/) installed for this tutorial. It
comes packaged with some operating systems such as macOS but you may need to
install it separately.


### Creating an S3 bucket

If you don't already have an Amazon AWS account, you can go 
[https://aws.amazon.com/](https://aws.amazon.com/) and click "Create Account".
Once you have an account, you'll need to create an AWS IAM user with
_programmatic access_ and with `AmazonS3FullAccess` permissions. After creating
the user, you should have an **access key id** and a **secret access key**. We
will use those in one of the steps below. <a href='/videos/iam.mp4'>Click here
to watch a short video on creating an AWS IAM user.</a>

You’ll also need to create a bucket in AWS S3. You’ll need to create a unique name for your bucket. 

{{< alert icon="❗️" text="In this tutorial, we’ll name our bucket 'mybkt.litestream.io' but replace that with your bucket name, like 'mybkt.yourdomain.com'." >}}


## Setting up your database

Now that our S3 bucket is created, we can replicate data to it. Litestream
can work with any SQLite database so we'll use the `sqlite3` command line tool
to show how it works.

**In a terminal window**, create a new database file:

```
sqlite3 fruits.db
```

This will open the SQLite command prompt and now we can execute SQL commands.
We'll start by creating a new table:

```
CREATE TABLE fruits (name TEXT, color TEXT);
```

And we can add some data to our table:

```
INSERT INTO fruits (name, color) VALUES ('apple', 'red');
INSERT INTO fruits (name, color) VALUES ('banana', 'yellow');
```

## Replicating your database

**In a separate terminal window**, we'll run Litestream to replicate our new
database. Make sure both terminal windows are using the same working directory.

Using the AWS credentials obtained in the [_prerequisites section_](#creating-an-s3-bucket)
above, add them to your environment variables. On macOS &
Linux, you can run this from your command line with your credentials:

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

Next, run Litesteam's `replicate` command to start replication:

```
litestream replicate fruits.db s3://mybkt.litestream.io/fruits.db
```

You should see Litestream print some initialization commands and then wait
indefinitely. Normally, Litestream is run as a background service so it
continuously watches your database for new changes so the command does not exit.

If you open the [S3 Management Console](https://s3.console.aws.amazon.com/s3),
you will see there is a `fruits.db` directory in your bucket.


## Restoring your database

**In a third terminal window**, we'll restore our database to a new file. First, 
make sure your environment variables are set correctly:

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

Then run:

```sh
litestream restore -o fruits2.db s3://mybkt.litestream.io/fruits.db
```

This will pull down the backup from S3 and write it to the `fruits2.db` file.
You can verify the database matches by opening it with SQLite:

```
sqlite3 fruits2.db
```

And reading the data:

```
SELECT * FROM fruits;
apple|red
banana|yellow
```

Then type `.quit` or hit `CTRL-D` to exit the `sqlite3` session.


## Continuous replication

Litestream continuously monitors your database and backs it up to S3. We can
see this by writing some more data to our original `fruits.db` database. In our
first terminal window, write a new row to our table:

```
INSERT INTO fruits (name, color) VALUES ('grape', 'purple');
```

Then in your **third terminal window**, restore your database from our S3 backup
to a new `fruits3.db` file:

```
litestream restore -o fruits3.db s3://mybkt.litestream.io/fruits.db
```

We can open this file:

```
sqlite3 fruits3.db
```

Then read the data and we should now see our new row:

```
SELECT * FROM fruits;
apple|red
banana|yellow
grape|purple
```

Then type `.quit` or hit `CTRL-D` to exit the `sqlite3` session.


## Further reading

Litestream was built to run as a background service that you don't need to worry
about—it just replicates your database all the time. To run Litestream as a
background service, please refer to the [How-To Guides section](/guides) to
run on your particular platform.


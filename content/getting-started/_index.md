---
title : "Getting Started"
date: 2021-02-01T00:00:00Z
layout: docs
---

This tutorial will get you up and running with Litestream locally and
replicating a SQLite database to Amazon S3. By the end, you'll understand the
`replicate` and `restore` commands and be able to continuously backup your
database. It assumes you're comfortable on the command line.

_You should expect to complete this tutorial in about 10 minutes._


## Prerequisites

### Install Litestream & SQLite

Before continuing, [please install Litestream on your local machine](/install).

You will also need [SQLite](https://sqlite.org/) installed for this tutorial. It
comes packaged with some operating systems such as Mac OS X but you may need to
install it separately.


### Creating an S3 bucket

If you don't already have an Amazon AWS account, you can go 
[https://aws.amazon.com/](https://aws.amazon.com/) and click "Create Account".
Once you have an account, you'll log in and obtain API credentials from their
IAM service. You should have an "access key id" and a "secret access key".
Once you have those, add them to your environment variables. On Mac OS X &
Linux, you can run this from your command line using your own key values:

```sh
export AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxxxxxxxx
export AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx/xxxxxxxxx
```

After your credentials are set, you'll also need to create a bucket in the S3
service of AWS. You'll need to create a unique name for your bucket. In this
tutorial, we'll name our bucket, `"mybkt.litestream.io"`.


## Setting up your database

Now that our S3 bucket is configured, we can replicate data to it. Litestream
can work with any SQLite database so we'll use the `sqlite3` command line tool
to show how it works.

First, we'll open a new database file:

```
sqlite3 fruits.db
```

This will open the SQLite command prompt and now we can execute SQL commands.
We'll start with creating a new table:

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

```
litestream replicate fruits.db s3://mybkt.litestream.io/fruits.db
```

You should see Litestream print some initialization commands and then hang
indefinitely. Normally, Litestream is run as a background service so it
continuously watches your database for new changes.

If you open the [S3 Management Console](https://s3.console.aws.amazon.com/s3),
you will see there is a `fruits.db` directory in your bucket.


## Restoring your database

**In a third terminal window**, we'll restore our database to a new file. Make
sure your environment variables are set correctly and run:

```
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

Litestream physically replicates the data so the original and restored database
should match byte-for-byte. You can verify this by running a checksum on the
files:

```
md5 fruit*
MD5 (fruit.db) = e6a6ceda013b99c7ddc8b68ebd4351d0
MD5 (fruit2.db) = e6a6ceda013b99c7ddc8b68ebd4351d0
```


## Continuous replication

Litestream continuously monitors your database and backs it up to S3. We can
see this by writing some more data to our original `fruit.db` database. Open
the database (if you don't already have it open):

```
sqlite3 fruit.db
```

Then write a new row to our table:

```
INSERT INTO fruits (name, color) VALUES ('grape', 'blue');
```

Then you can restore your database from our S3 backup to a new `fruits3.db` file:

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


## Further reading

Litestream was built to run as a background service that you don't need to worry
about—it just replicates your database all the time. To run Litestream as a
background service, please refer to the [How-To Guides section](/guides) to
run on your particular platform.


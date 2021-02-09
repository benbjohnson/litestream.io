---
title: "Introducing Litestream"
lead: "Application development keeps getting harder as we add more tools. Litestream hopes to reverse that trend by letting developers write production-ready, single-node applications."
date: 2021-02-06T00:00:00Z
lastmod: 2021-02-06T00:00:00Z
draft: true
weight: 50
contributors: ["Ben Johnson"]
---


## What is Litestream?

Litestream is a streaming replication tool for SQLite. It runs as a separate
process and continuously streams WAL writes from your database to S3-compatible
storage. If your server dies in a fire then you can run a single recovery
command to quickly rebuild your database to its state at the point of failure.




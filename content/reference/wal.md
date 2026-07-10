---
title : "Command: wal"
date: 2021-02-01T00:00:00Z
layout: docs
menu:
  docs:
    parent: "reference"
weight: 570
---

{{< alert icon="⚠️" text="The wal command has been deprecated in v0.5.0 and replaced with the ltx command." >}}

The `wal` command is a deprecated alias for the [`ltx` command]({{< ref "ltx" >}}).
Running it prints a deprecation warning and then executes `ltx` with the same
arguments:

```
$ litestream wal /var/lib/db
Warning: 'wal' command is deprecated, please use 'ltx' instead
```

It accepts only the `ltx` flags (`-config`, `-no-expand-env`, `-level`,
`-json`). See the [`ltx` command reference]({{< ref "ltx" >}}) for usage,
arguments, and examples.

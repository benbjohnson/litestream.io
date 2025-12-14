---
title : "Replicating to Azure Blob Storage"
date: 2021-06-02T00:00:00Z
layout: docs
menu:
  docs:
    parent: "replica-guides"
weight: 410
---

This guide will show you how to use Litestream to replicate to an [Azure Blob
Storage][] container. You will need an [Azure][] account and to complete this
guide.

[Azure Blob Storage]: https://azure.microsoft.com/en-us/services/storage/blobs/
[Azure]: https://azure.microsoft.com/en-us/


## Setup

### Create a container

In the [Azure Portal][], use the top search bar to navigate to _"Storage
Accounts"_. If you do not have a storage account, click the _"New"_ button,
enter your storage account name, and click _"Review + create"_.

Once you have a storage account, select it from the list of accounts and
navigate to the _Containers_ subsection. Click the _"+"_ button to create a new
container. Remember your storage account name and your container name as you'll
need those later.

[Azure Portal]: https://portal.azure.com/


### Create an access key

From your storage account, navigate to the _Access Keys_ subsection. You'll see
two access keys already exist. Click the _"Show keys"_ button to reveal them.
Copy the value of one of the _"Key"_ textboxes. This will be be your account key.


## Usage

### Command line usage

You can replicate to [Azure Blob Storage][] from the command line by setting
your account key via an environment variable:

```sh
export LITESTREAM_AZURE_ACCOUNT_KEY=...
```

You can then specify your replica as a replica URL on the command line. For
example, you can replicate a database to your container with the following
command. _Replace the placeholders for your account, container, & path._

```sh
litestream replicate /path/to/db abs://STORAGEACCOUNT@CONTAINERNAME/PATH
```

You can later restore your database from Azure Blob Storage to a local `my.db`
path with the following command.

```sh
litestream restore -o my.db abs://STORAGEACCOUNT@CONTAINERNAME/PATH
```

### Configuration file usage

Litestream is typically run as a background service which uses a [configuration
file][]. You can configure a replica for your database using the `url` format.

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      url: abs://STORAGEACCOUNT@CONTAINERNAME/PATH
      account-key:  ACCOUNTKEY
```

Or you can expand your configuration into multiple fields:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: abs
      account-name: STORAGEACCOUNT
      account-key:  ACCOUNTKEY
      bucket:       CONTAINERNAME
      path:         PATH
```

You can also use the `LITESTREAM_AZURE_ACCOUNT_KEY` environment variable instead
of specifying the account key in your configuration file.

{{< since version="0.5.0" >}} Litestream v0.5.0+ uses Azure SDK v2, which maintains compatibility with existing authentication methods and adds support for Azure's default credential chain including Managed Identity. See the [Azure SDK v2 Migration Guide](/docs/migration/#azure-sdk-v2-migration) for details on new authentication options.

## Authentication Methods

### Shared Key (Account Key)

The simplest authentication method uses your storage account key:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: abs
      account-name: STORAGEACCOUNT
      account-key: ACCOUNTKEY
      bucket: CONTAINERNAME
      path: PATH
```

Or via environment variable:

```sh
export LITESTREAM_AZURE_ACCOUNT_KEY=your-account-key
```

### Managed Identity (Azure Infrastructure)

{{< since version="0.5.0" >}} When running on Azure infrastructure (VMs, App Service, Container Apps, AKS), you can use Managed Identity without any credentials:

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: abs
      account-name: STORAGEACCOUNT
      bucket: CONTAINERNAME
      path: PATH
      # No account-key needed - uses Managed Identity
```

Ensure your Azure resource has a Managed Identity enabled and has the appropriate role assignment (e.g., "Storage Blob Data Contributor") on the storage account.

### Service Principal

{{< since version="0.5.0" >}} For non-Azure environments or when Managed Identity isn't suitable, use a service principal via environment variables:

```sh
export AZURE_CLIENT_ID=your-app-id
export AZURE_TENANT_ID=your-tenant-id
export AZURE_CLIENT_SECRET=your-client-secret
```

```yaml
dbs:
  - path: /path/to/local/db
    replica:
      type: abs
      account-name: STORAGEACCOUNT
      bucket: CONTAINERNAME
      path: PATH
```

### Azure CLI (Local Development)

{{< since version="0.5.0" >}} For local development, authenticate using the Azure CLI:

```sh
az login
```

Litestream will automatically use your Azure CLI credentials when no other authentication method is configured.


## See Also

- [Azure SDK v2 Migration](/docs/migration#azure-sdk-v2-migration) - Upgrading authentication
- [Troubleshooting](/docs/troubleshooting) - Common issues and solutions
- [Configuration Reference](/reference/config) - Complete configuration options


[configuration file]: /reference/config

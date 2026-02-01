var suggestions=document.getElementById("suggestions"),userinput=document.getElementById("userinput");document.addEventListener("keydown",inputFocus);function inputFocus(e){e.keyCode===191&&(e.preventDefault(),userinput.focus()),e.keyCode===27&&(userinput.blur(),suggestions.classList.add("d-none"))}document.addEventListener("click",function(e){var t=suggestions.contains(e.target);t||suggestions.classList.add("d-none")}),document.addEventListener("keydown",suggestionFocus);function suggestionFocus(e){const s=suggestions.querySelectorAll("a"),o=[...s],t=o.indexOf(document.activeElement);let n=0;e.keyCode===38?(e.preventDefault(),n=t>0?t-1:0,s[n].focus()):e.keyCode===40&&(e.preventDefault(),n=t+1<o.length?t+1:t,s[n].focus())}(function(){var e=new FlexSearch({preset:"score",cache:!0,doc:{id:"id",field:["title","description","content"],store:["href","title","description"]}}),n=[{id:0,href:"https://litestream.io/docs/migration/",title:"Migration Guide",description:"Guide for upgrading Litestream and migrating between configurations",content:`<h2 id="overview">Overview</h2>
<p>This guide covers upgrading Litestream versions, migrating configuration formats, and switching between replica types. Follow the appropriate section based on your current setup and target version.</p>
<h2 id="version-upgrades">Version Upgrades</h2>
<h3 id="upgrading-to-v050">Upgrading to v0.5.0+</h3>
<p><span class="badge badge-info litestream-version" title="This feature has been available since Litestream v0.5.0">
    v0.5.0
</span>
 includes MCP support and NATS replication.</p>
<h4 id="pre-upgrade-checklist">Pre-Upgrade Checklist</h4>
<ol>
<li>
<p><strong>Backup your current setup</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Stop Litestream</span>
</span></span><span class="line"><span class="cl">sudo systemctl stop litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Backup configuration</span>
</span></span><span class="line"><span class="cl">cp /etc/litestream.yml /etc/litestream.yml.backup
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Backup binary</span>
</span></span><span class="line"><span class="cl">cp <span class="k">$(</span>which litestream<span class="k">)</span> /usr/local/bin/litestream.backup
</span></span></code></pre></div></li>
<li>
<p><strong>Review configuration changes</strong> (see Configuration Migration below)</p>
</li>
<li>
<p><strong>Test in staging environment</strong> before upgrading production</p>
</li>
</ol>
<h4 id="installation">Installation</h4>
<p>Download and install the new version:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Download latest stable release (check https://github.com/benbjohnson/litestream/releases)</span>
</span></span><span class="line"><span class="cl">wget https://github.com/benbjohnson/litestream/releases/download/v0.5.6/litestream-0.5.6-linux-x86_64.tar.gz
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Extract and install</span>
</span></span><span class="line"><span class="cl">tar -xzf litestream-0.5.6-linux-x86_64.tar.gz
</span></span><span class="line"><span class="cl">sudo mv litestream /usr/local/bin/
</span></span><span class="line"><span class="cl">sudo chmod +x /usr/local/bin/litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Verify installation</span>
</span></span><span class="line"><span class="cl">litestream version
</span></span></code></pre></div><h3 id="upgrading-from-v03x-to-v050">Upgrading from v0.3.x to v0.5.0+</h3>
<h4 id="key-changes">Key Changes</h4>
<ol>
<li>
<p><strong>SQLite Driver Change</strong>:</p>
<ul>
<li>Migration from <code>mattn/go-sqlite3</code> (cgo-based) to <code>modernc.org/sqlite</code> (pure Go)</li>
<li>No cgo requirement for main binary (simpler builds, better cross-compilation)</li>
<li><strong>PRAGMA configuration syntax changed</strong> (see <a href="#sqlite-driver-migration">SQLite Driver Migration</a> below)</li>
</ul>
</li>
<li>
<p><strong>Cloud SDK Upgrades</strong>:</p>
<ul>
<li>AWS SDK v1 → v2 with improved credential chain support</li>
<li>Azure SDK v1 → v2 with Managed Identity support (see <a href="#azure-sdk-v2-migration">Azure SDK v2 Migration</a> below)</li>
</ul>
</li>
<li>
<p><strong>Command Changes</strong>:</p>
<ul>
<li><code>litestream wal</code> → <code>litestream ltx</code> (WAL command renamed to LTX)</li>
<li>New <code>mcp-addr</code> configuration option for Model Context Protocol support</li>
<li>NATS replica support with JetStream</li>
</ul>
</li>
<li>
<p><strong>Configuration Changes</strong>:</p>
<ul>
<li>Single <code>replica</code> field replaces <code>replicas</code> array (backward compatible)</li>
<li>New global configuration sections: <code>levels</code>, <code>snapshot</code>, <code>exec</code></li>
<li>Extended replica configuration options</li>
</ul>
</li>
</ol>
<h4 id="migration-steps">Migration Steps</h4>
<ol>
<li><strong>Update configuration format</strong>:</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># OLD FORMAT (still supported, but only with a single replica)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replicas</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">72h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># NEW FORMAT (recommended)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">72h</span><span class="w">
</span></span></span></code></pre></div><ol>
<li><strong>Override default settings</strong>:</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Add MCP support (disabled by default)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">mcp-addr</span><span class="p">:</span><span class="w"> </span><span class="s2">&#34;:3001&#34;</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Override global snapshot configuration (defaults: interval=24h, retention=24h)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">snapshot</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">168h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Add level-based retention (no default levels configured)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">levels</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">1h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">168h</span><span class="w">
</span></span></span></code></pre></div><ol>
<li><strong>Update command usage</strong>:</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># OLD: Query WAL information</span>
</span></span><span class="line"><span class="cl">litestream wal /path/to/db.sqlite
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># NEW: Query LTX information</span>
</span></span><span class="line"><span class="cl">litestream ltx /path/to/db.sqlite
</span></span></code></pre></div><ol>
<li><strong>Restart services</strong>:</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Restart Litestream with new configuration</span>
</span></span><span class="line"><span class="cl">sudo systemctl restart litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Verify it&#39;s working</span>
</span></span><span class="line"><span class="cl">sudo systemctl status litestream
</span></span><span class="line"><span class="cl">litestream databases
</span></span></code></pre></div><h3 id="age-encryption-migration">Age Encryption Migration</h3>
<div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">⚠️</div>
  <div class="w-100">**Important**: Age encryption is not available in v0.5.0+. If you are upgrading from v0.3.x with Age encryption configured, your replica will be rejected with an explicit error message.</div>
</div>
<h4 id="who-is-affected">Who is Affected</h4>
<p>If you meet <strong>any</strong> of the following conditions, this section applies to you:</p>
<ul>
<li>Running v0.3.x with Age encryption enabled</li>
<li>Have Age encryption configured in your <code>litestream.yml</code></li>
<li>Have existing Age-encrypted backups in S3, GCS, Azure, or other storage</li>
</ul>
<h4 id="why-age-encryption-was-disabled">Why Age Encryption Was Disabled</h4>
<p>Age encryption was removed from v0.5.0+ as part of the LTX storage layer refactor. The core issue is that <strong>Age encrypts entire files as a single unit</strong>, which doesn&rsquo;t align with Litestream&rsquo;s new architecture.</p>
<p>Litestream&rsquo;s v0.5+ uses the LTX format which allows <strong>per-page encryption</strong> - the ability to fetch and decrypt individual pages from storage (S3, GCS, etc.) without needing the entire file. This is more efficient and provides better integration with cloud storage.</p>
<p>The feature was not maintained and has been disabled to prevent accidental data loss from misconfigured encryption (users believing their data was encrypted when it wasn&rsquo;t being encrypted at all).</p>
<h4 id="upgrade-options">Upgrade Options</h4>
<p>Choose the option that best fits your situation:</p>
<h4 id="option-1-stay-on-v03x">Option 1: Stay on v0.3.x</h4>
<p>If you need Age encryption, remain on v0.3.x until the feature is restored:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check your current version</span>
</span></span><span class="line"><span class="cl">litestream version
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># If you&#39;ve already upgraded to v0.5, downgrade to latest v0.3</span>
</span></span><span class="line"><span class="cl">wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">sudo mv litestream /usr/local/bin/
</span></span><span class="line"><span class="cl">sudo systemctl restart litestream
</span></span></code></pre></div><h4 id="option-2-upgrade-to-v050-remove-age-encryption">Option 2: Upgrade to v0.5.0+ (Remove Age Encryption)</h4>
<p>If you can migrate away from Age encryption:</p>
<ol>
<li>
<p><strong>Validate your current backups are accessible</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -o /tmp/test-restore.db /var/lib/app.db
</span></span></code></pre></div></li>
<li>
<p><strong>Remove Age encryption from configuration</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># REMOVE this entire section from your litestream.yml</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">age</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">identities</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span>- <span class="l">/etc/litestream/age-identity.txt</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">recipients</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span>- <span class="l">age1xxxxxxxxxxxxx</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Your replica should look like:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="c"># No &#39;age&#39; section</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Migrate existing encrypted backups</strong> (optional):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Decrypt and restore from v0.3.x backup</span>
</span></span><span class="line"><span class="cl">litestream restore -o /tmp/decrypted.db /var/lib/app.db
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Stop replication</span>
</span></span><span class="line"><span class="cl">sudo systemctl stop litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Delete old encrypted replica (careful!)</span>
</span></span><span class="line"><span class="cl"><span class="c1"># Example for S3:</span>
</span></span><span class="line"><span class="cl">aws s3 rm s3://my-bucket/app --recursive
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Update configuration and restart</span>
</span></span><span class="line"><span class="cl">sudo systemctl start litestream
</span></span></code></pre></div></li>
<li>
<p><strong>Verify new backups are working</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Wait a few minutes for replication to occur</span>
</span></span><span class="line"><span class="cl">litestream databases
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Test restore functionality</span>
</span></span><span class="line"><span class="cl">litestream restore -o /tmp/verify.db /var/lib/app.db
</span></span></code></pre></div></li>
</ol>
<h4 id="option-3-use-unencrypted-backups-temporarily">Option 3: Use Unencrypted Backups Temporarily</h4>
<p>While Age encryption is unavailable, use standard unencrypted replication:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">72h</span><span class="w">
</span></span></span></code></pre></div><p>For encryption at rest, consider:</p>
<ul>
<li>S3 Server-Side Encryption (SSE-S3, SSE-KMS)</li>
<li>Google Cloud Storage encryption</li>
<li>Azure Blob Storage encryption</li>
<li>Encrypted storage volumes at the provider level</li>
</ul>
<h4 id="frequently-asked-questions">Frequently Asked Questions</h4>
<p><strong>Q: Will my v0.3.x Age-encrypted backups still work with v0.5?</strong></p>
<p>A: No. If you have v0.3.x Age-encrypted backups and try to restore with v0.5, the restore will fail because Age encryption is not available in v0.5. You must either stay on v0.3.x to restore the backups or decrypt them first while still on v0.3.x.</p>
<p><strong>Q: Do I need to re-encrypt existing backups?</strong></p>
<p>A: No, your existing v0.3.x Age-encrypted backups remain encrypted in storage. The issue only affects upgrading to v0.5.0+. If you stay on v0.3.x, your backups continue to work normally.</p>
<p><strong>Q: What if I&rsquo;m already using Age encryption in production?</strong></p>
<p>A: Do not upgrade to v0.5.0+ at this time. Stay on v0.3.x. Monitor the <a href="https://github.com/benbjohnson/litestream/releases">Litestream releases</a> page for updates on Age encryption restoration.</p>
<p><strong>Q: When will encryption be restored?</strong></p>
<p>A: Encryption support will be re-implemented <strong>directly in the LTX format</strong> to support per-page encryption. This is planned work but no timeline has been announced. The implementation is complex and requires careful design to work efficiently with cloud storage providers.</p>
<p>If you need encryption immediately, you can:</p>
<ul>
<li>Stay on v0.3.x with Age encryption</li>
<li>Use provider-level encryption (S3 SSE-KMS, GCS encryption, Azure encryption, etc.)</li>
<li>Use database-level encryption (SQLCipher)</li>
</ul>
<p>See <a href="https://github.com/benbjohnson/litestream/issues/458">issue #458</a> (LTX Support) for the tracking issue on encryption and other planned LTX features.</p>
<h4 id="validation-before-upgrading">Validation Before Upgrading</h4>
<p>Before upgrading to v0.5.0+, if you use Age encryption:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check if you have Age encryption in your config</span>
</span></span><span class="line"><span class="cl">grep -n <span class="s2">&#34;age:&#34;</span> /etc/litestream.yml
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># If the above returns results, you MUST:</span>
</span></span><span class="line"><span class="cl"><span class="c1"># 1. Stay on v0.3.x, OR</span>
</span></span><span class="line"><span class="cl"><span class="c1"># 2. Remove Age encryption configuration before upgrading</span>
</span></span></code></pre></div><h3 id="azure-sdk-v2-migration">Azure SDK v2 Migration</h3>
<p><span class="badge badge-info litestream-version" title="This feature has been available since Litestream v0.5.0">
    v0.5.0
</span>
 Litestream v0.5.0 upgraded from the deprecated Azure Storage SDK (<code>github.com/Azure/azure-storage-blob-go</code>) to the modern Azure SDK for Go v2 (<code>github.com/Azure/azure-sdk-for-go/sdk/storage/azblob</code>). This change brings significant improvements in authentication, reliability, and maintenance.</p>
<h4 id="why-this-change-was-made">Why This Change Was Made</h4>
<p>The migration to Azure SDK v2 provides several benefits:</p>
<ul>
<li><strong>Modern authentication</strong>: Support for Azure&rsquo;s default credential chain including Managed Identity</li>
<li><strong>Better reliability</strong>: Improved retry policies with exponential backoff</li>
<li><strong>Active maintenance</strong>: The legacy SDK was retired in September 2024</li>
<li><strong>Consistent patterns</strong>: Aligned with AWS SDK v2 upgrade for unified configuration experience</li>
</ul>
<div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">💡</div>
  <div class="w-100">The legacy azure-storage-blob-go SDK reached end of Community Support on September 13, 2024. All new Azure Blob Storage integrations should use the modern SDK.</div>
</div>
<h4 id="authentication-changes">Authentication Changes</h4>
<p>The most significant improvement is support for Azure&rsquo;s <strong>default credential chain</strong> (<code>DefaultAzureCredential</code>). This allows flexible authentication across different environments without code changes.</p>
<h5 id="credential-chain-order">Credential Chain Order</h5>
<p>When no explicit credentials are configured, Litestream attempts authentication in this order:</p>
<ol>
<li><strong>Environment Credential</strong> (service principal via environment variables)</li>
<li><strong>Workload Identity Credential</strong> (Kubernetes workload identity)</li>
<li><strong>Managed Identity Credential</strong> (Azure VMs, App Service, Functions)</li>
<li><strong>Azure CLI Credential</strong> (local development with <code>az login</code>)</li>
<li><strong>Azure Developer CLI Credential</strong> (local development with <code>azd auth login</code>)</li>
</ol>
<div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">💡</div>
  <div class="w-100">When running outside Azure infrastructure, the credential chain may take several seconds to complete as it attempts each method. This is normal behavior—the Managed Identity check times out when not on Azure. For faster startup in non-Azure environments, use explicit credentials (account key or service principal environment variables).</div>
</div>
<h5 id="environment-variables-for-service-principal">Environment Variables for Service Principal</h5>
<p>To authenticate using a service principal, set these environment variables:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_ID</span><span class="o">=</span>your-app-id
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_TENANT_ID</span><span class="o">=</span>your-tenant-id
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_SECRET</span><span class="o">=</span>your-client-secret
</span></span></code></pre></div><p>For certificate-based authentication:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_ID</span><span class="o">=</span>your-app-id
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_TENANT_ID</span><span class="o">=</span>your-tenant-id
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_CERTIFICATE_PATH</span><span class="o">=</span>/path/to/cert.pem
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_CERTIFICATE_PASSWORD</span><span class="o">=</span>optional-password
</span></span></code></pre></div><h5 id="managed-identity-recommended-for-azure">Managed Identity (Recommended for Azure)</h5>
<p>When running on Azure infrastructure (VMs, App Service, Container Apps, AKS), Managed Identity is the recommended authentication method. No credentials or environment variables are required:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">abs://STORAGEACCOUNT@CONTAINERNAME/PATH</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># No account-key needed - uses Managed Identity</span><span class="w">
</span></span></span></code></pre></div><div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">⚠️</div>
  <div class="w-100">Managed Identity only works when running on Azure infrastructure. For local development, use Azure CLI authentication (\`az login\`) or explicit credentials.</div>
</div>
<h5 id="shared-key-authentication-backward-compatible">Shared Key Authentication (Backward Compatible)</h5>
<p>Existing configurations using account keys continue to work:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">abs://STORAGEACCOUNT@CONTAINERNAME/PATH</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-key</span><span class="p">:</span><span class="w"> </span><span class="l">ACCOUNTKEY</span><span class="w">
</span></span></span></code></pre></div><p>Or using environment variables:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">LITESTREAM_AZURE_ACCOUNT_KEY</span><span class="o">=</span>your-account-key
</span></span></code></pre></div><h4 id="configuration-migration">Configuration Migration</h4>
<h5 id="no-breaking-changes">No Breaking Changes</h5>
<p>The upgrade to Azure SDK v2 maintains <strong>full backward compatibility</strong>. All existing Litestream configurations for Azure Blob Storage will continue to work without modification.</p>
<h5 id="new-capabilities">New Capabilities</h5>
<p>With SDK v2, you can now:</p>
<ul>
<li>Use Managed Identity without any credential configuration</li>
<li>Leverage service principal authentication via environment variables</li>
<li>Benefit from improved retry handling automatically</li>
</ul>
<h5 id="before-and-after-examples">Before and After Examples</h5>
<p><strong>Shared Key Authentication</strong> (unchanged):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># v0.3.x and v0.5.x - identical configuration</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">abs</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-name</span><span class="p">:</span><span class="w"> </span><span class="l">mystorageaccount</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-key</span><span class="p">:</span><span class="w"> </span><span class="l">\${AZURE_STORAGE_KEY}</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">bucket</span><span class="p">:</span><span class="w"> </span><span class="l">mycontainer</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">backups/app</span><span class="w">
</span></span></span></code></pre></div><p><strong>Managed Identity</strong> (new in v0.5.x):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># v0.5.x - no credentials needed on Azure infrastructure</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">abs</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-name</span><span class="p">:</span><span class="w"> </span><span class="l">mystorageaccount</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">bucket</span><span class="p">:</span><span class="w"> </span><span class="l">mycontainer</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">backups/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Automatically uses Managed Identity when available</span><span class="w">
</span></span></span></code></pre></div><p><strong>Service Principal</strong> (new in v0.5.x):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Set environment variables</span>
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_ID</span><span class="o">=</span>12345678-1234-1234-1234-123456789012
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_TENANT_ID</span><span class="o">=</span>87654321-4321-4321-4321-210987654321
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AZURE_CLIENT_SECRET</span><span class="o">=</span>your-client-secret
</span></span></code></pre></div><div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Configuration - no credentials in file</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">abs</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-name</span><span class="p">:</span><span class="w"> </span><span class="l">mystorageaccount</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">bucket</span><span class="p">:</span><span class="w"> </span><span class="l">mycontainer</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">backups/app</span><span class="w">
</span></span></span></code></pre></div><h4 id="retry-policy-changes">Retry Policy Changes</h4>
<p>Azure SDK v2 includes improved retry handling:</p>
<table>
<thead>
<tr>
<th>Setting</th>
<th>Value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>Max Retries</td>
<td>10</td>
<td>Maximum retry attempts</td>
</tr>
<tr>
<td>Retry Delay</td>
<td>1-30 seconds</td>
<td>Exponential backoff range</td>
</tr>
<tr>
<td>Try Timeout</td>
<td>15 minutes</td>
<td>Timeout per individual attempt</td>
</tr>
<tr>
<td>Status Codes</td>
<td>408, 429, 500, 502, 503, 504</td>
<td>HTTP codes that trigger retries</td>
</tr>
</tbody>
</table>
<p>These settings are optimized for Azure Blob Storage and follow <a href="https://learn.microsoft.com/en-us/azure/storage/blobs/storage-retry-policy-go">Azure SDK best practices</a>.</p>
<h4 id="troubleshooting">Troubleshooting</h4>
<h5 id="authentication-errors">Authentication Errors</h5>
<p><strong>Error</strong>: <code>DefaultAzureCredential: failed to acquire a token</code></p>
<p><strong>Solutions</strong>:</p>
<ol>
<li><strong>On Azure infrastructure</strong>: Ensure Managed Identity is enabled for your resource</li>
<li><strong>Local development</strong>: Run <code>az login</code> to authenticate with Azure CLI</li>
<li><strong>Service principal</strong>: Verify environment variables are set correctly</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check if environment variables are set</span>
</span></span><span class="line"><span class="cl"><span class="nb">echo</span> <span class="nv">$AZURE_CLIENT_ID</span>
</span></span><span class="line"><span class="cl"><span class="nb">echo</span> <span class="nv">$AZURE_TENANT_ID</span>
</span></span><span class="line"><span class="cl"><span class="nb">echo</span> <span class="nv">$AZURE_CLIENT_SECRET</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Test Azure CLI authentication</span>
</span></span><span class="line"><span class="cl">az account show
</span></span></code></pre></div><p><strong>Error</strong>: <code>AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET must be set</code></p>
<p><strong>Solution</strong>: This indicates service principal authentication is being attempted but environment variables are missing. Either:</p>
<ul>
<li>Set all three environment variables, or</li>
<li>Use a different authentication method (Managed Identity, Azure CLI, or account key)</li>
</ul>
<h5 id="timeout-errors">Timeout Errors</h5>
<p>If you encounter timeout errors with large databases:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">abs</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-name</span><span class="p">:</span><span class="w"> </span><span class="l">mystorageaccount</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">bucket</span><span class="p">:</span><span class="w"> </span><span class="l">mycontainer</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">backups/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># SDK v2 has a 15-minute per-operation timeout by default</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Contact the Litestream team if you need adjustments</span><span class="w">
</span></span></span></code></pre></div><h5 id="verifying-sdk-version">Verifying SDK Version</h5>
<p>To confirm you&rsquo;re running Litestream v0.5.0+ with Azure SDK v2:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream version
</span></span><span class="line"><span class="cl"><span class="c1"># Should show v0.5.0 or later</span>
</span></span></code></pre></div><h5 id="common-migration-issues">Common Migration Issues</h5>
<p><strong>Issue</strong>: Authentication worked in v0.3.x but fails in v0.5.x</p>
<p><strong>Cause</strong>: The SDK v2 credential chain may behave differently than SDK v1</p>
<p><strong>Solution</strong>: Explicitly specify credentials using either:</p>
<ul>
<li><code>account-key</code> in configuration</li>
<li><code>LITESTREAM_AZURE_ACCOUNT_KEY</code> environment variable</li>
<li>Service principal environment variables (<code>AZURE_CLIENT_ID</code>, etc.)</li>
</ul>
<h4 id="breaking-changes">Breaking Changes</h4>
<p>There are no breaking changes. All v0.3.x Azure Blob Storage configurations work with v0.5.0 without modification. The SDK upgrade is transparent to users with existing configurations.</p>
<h4 id="further-reading">Further Reading</h4>
<ul>
<li><a href="/guides/azure">Azure Blob Storage Guide</a></li>
<li><a href="https://learn.microsoft.com/en-us/azure/developer/go/sdk/authentication/authentication-overview">Azure SDK for Go Authentication Overview</a></li>
<li><a href="https://pkg.go.dev/github.com/Azure/azure-sdk-for-go/sdk/azidentity#DefaultAzureCredential">DefaultAzureCredential Documentation</a></li>
<li><a href="https://learn.microsoft.com/en-us/azure/storage/blobs/storage-retry-policy-go">Azure Blob Storage Retry Policies</a></li>
</ul>
<h3 id="sqlite-driver-migration">SQLite Driver Migration</h3>
<p><span class="badge badge-info litestream-version" title="This feature has been available since Litestream v0.5.0">
    v0.5.0
</span>
 Litestream v0.5.0 migrated from <a href="https://github.com/mattn/go-sqlite3">mattn/go-sqlite3</a> (cgo-based) to <a href="https://pkg.go.dev/modernc.org/sqlite">modernc.org/sqlite</a> (pure Go). This change provides significant benefits but requires attention to PRAGMA configuration syntax.</p>
<h4 id="why-this-change-was-made-1">Why This Change Was Made</h4>
<p>The migration to <code>modernc.org/sqlite</code> provides several benefits:</p>
<ul>
<li><strong>No cgo requirement</strong>: The main Litestream binary no longer requires a C compiler or cgo toolchain to build</li>
<li><strong>Easier cross-compilation</strong>: Build for any platform without complex cross-compilation toolchains</li>
<li><strong>Signed macOS releases</strong>: Enables automatic signing of Apple Silicon Mac releases</li>
<li><strong>Simpler deployment</strong>: No C library dependencies to manage</li>
</ul>
<div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">💡</div>
  <div class="w-100">The VFS feature (litestream-vfs) still uses cgo-based drivers for performance reasons and remains experimental.</div>
</div>
<h4 id="pragma-configuration-changes">PRAGMA Configuration Changes</h4>
<p>The most significant change is how PRAGMAs are configured in database connection strings. The <code>modernc.org/sqlite</code> driver uses a different syntax than <code>mattn/go-sqlite3</code>.</p>
<h5 id="syntax-comparison">Syntax Comparison</h5>
<table>
<thead>
<tr>
<th>PRAGMA</th>
<th>mattn/go-sqlite3 (v0.3.x)</th>
<th>modernc.org/sqlite (v0.5.0+)</th>
</tr>
</thead>
<tbody>
<tr>
<td>busy_timeout</td>
<td><code>?_busy_timeout=5000</code></td>
<td><code>?_pragma=busy_timeout(5000)</code></td>
</tr>
<tr>
<td>journal_mode</td>
<td><code>?_journal_mode=WAL</code></td>
<td><code>?_pragma=journal_mode(WAL)</code></td>
</tr>
<tr>
<td>synchronous</td>
<td><code>?_synchronous=NORMAL</code></td>
<td><code>?_pragma=synchronous(NORMAL)</code></td>
</tr>
<tr>
<td>foreign_keys</td>
<td><code>?_foreign_keys=1</code></td>
<td><code>?_pragma=foreign_keys(1)</code></td>
</tr>
<tr>
<td>cache_size</td>
<td><code>?_cache_size=2000</code></td>
<td><code>?_pragma=cache_size(2000)</code></td>
</tr>
</tbody>
</table>
<h5 id="connection-string-examples">Connection String Examples</h5>
<p><strong>v0.3.x (mattn/go-sqlite3):</strong></p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl">file:/path/to/db.sqlite?_busy_timeout=5000&amp;_journal_mode=WAL&amp;_synchronous=NORMAL
</span></span></code></pre></div><p><strong>v0.5.0+ (modernc.org/sqlite):</strong></p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl">file:/path/to/db.sqlite?_pragma=busy_timeout(5000)&amp;_pragma=journal_mode(WAL)&amp;_pragma=synchronous(NORMAL)
</span></span></code></pre></div><h5 id="multiple-pragmas">Multiple PRAGMAs</h5>
<p>The <code>_pragma</code> parameter can be specified multiple times:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl">file:/path/to/db.sqlite?_pragma=busy_timeout(5000)&amp;_pragma=journal_mode(WAL)&amp;_pragma=foreign_keys(1)
</span></span></code></pre></div><h4 id="impact-on-litestream-users">Impact on Litestream Users</h4>
<p>For most Litestream users, this change is transparent. Litestream handles database connections internally and has been updated to use the new syntax. However, if you:</p>
<ul>
<li><strong>Use Litestream as a library</strong>: Update your connection strings to use the new <code>_pragma=name(value)</code> syntax</li>
<li><strong>Pass custom DSN options</strong>: Review and update your database paths</li>
<li><strong>Build Litestream from source</strong>: Note that cgo is no longer required for the main binary</li>
</ul>
<h4 id="for-library-users">For Library Users</h4>
<p>If you embed Litestream as a library and need to configure SQLite pragmas:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-go" data-lang="go"><span class="line"><span class="cl"><span class="c1">// v0.3.x style (mattn/go-sqlite3) - NO LONGER WORKS
</span></span></span><span class="line"><span class="cl"><span class="c1">// dsn := &#34;file:/path/to/db?_busy_timeout=5000&#34;
</span></span></span><span class="line"><span class="cl"><span class="c1"></span>
</span></span><span class="line"><span class="cl"><span class="c1">// v0.5.0+ style (modernc.org/sqlite)
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="nx">dsn</span> <span class="o">:=</span> <span class="s">&#34;file:/path/to/db?_pragma=busy_timeout(5000)&#34;</span>
</span></span></code></pre></div><h4 id="building-from-source">Building from Source</h4>
<p>v0.5.0+ simplifies the build process:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># v0.3.x required cgo</span>
</span></span><span class="line"><span class="cl"><span class="nv">CGO_ENABLED</span><span class="o">=</span><span class="m">1</span> go build ./cmd/litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># v0.5.0+ does not require cgo for main binary</span>
</span></span><span class="line"><span class="cl"><span class="nv">CGO_ENABLED</span><span class="o">=</span><span class="m">0</span> go build ./cmd/litestream
</span></span></code></pre></div><p>Cross-compilation is now straightforward:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Build for Linux on macOS (or any platform)</span>
</span></span><span class="line"><span class="cl"><span class="nv">GOOS</span><span class="o">=</span>linux <span class="nv">GOARCH</span><span class="o">=</span>amd64 go build ./cmd/litestream
</span></span><span class="line"><span class="cl"><span class="nv">GOOS</span><span class="o">=</span>linux <span class="nv">GOARCH</span><span class="o">=</span>arm64 go build ./cmd/litestream
</span></span><span class="line"><span class="cl"><span class="nv">GOOS</span><span class="o">=</span>windows <span class="nv">GOARCH</span><span class="o">=</span>amd64 go build ./cmd/litestream
</span></span></code></pre></div><h4 id="driver-selection-for-library-users">Driver Selection for Library Users</h4>
<p>If you use Litestream as a library and need the cgo-based driver (for VFS support or performance testing):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-go" data-lang="go"><span class="line"><span class="cl"><span class="kn">import</span> <span class="p">(</span>
</span></span><span class="line"><span class="cl">    <span class="c1">// Pure Go driver (default in v0.5.0+)
</span></span></span><span class="line"><span class="cl"><span class="c1"></span>    <span class="nx">_</span> <span class="s">&#34;modernc.org/sqlite&#34;</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl">    <span class="c1">// OR cgo-based driver (for VFS/experimental features)
</span></span></span><span class="line"><span class="cl"><span class="c1"></span>    <span class="c1">// _ &#34;github.com/mattn/go-sqlite3&#34;
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="p">)</span>
</span></span></code></pre></div><p>Build tags control which driver is compiled:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Default: modernc.org/sqlite</span>
</span></span><span class="line"><span class="cl">go build ./cmd/litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># VFS extension (requires cgo and additional build steps)</span>
</span></span><span class="line"><span class="cl"><span class="c1"># See the VFS Guide for complete build instructions:</span>
</span></span><span class="line"><span class="cl"><span class="c1"># https://litestream.io/guides/vfs/</span>
</span></span></code></pre></div><h4 id="common-pragma-reference">Common PRAGMA Reference</h4>
<p>Here are commonly used PRAGMAs with the v0.5.0+ syntax:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl"># Recommended production settings
</span></span><span class="line"><span class="cl">?_pragma=busy_timeout(5000)&amp;_pragma=journal_mode(WAL)&amp;_pragma=synchronous(NORMAL)&amp;_pragma=foreign_keys(1)
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"># Individual PRAGMAs:
</span></span><span class="line"><span class="cl">_pragma=busy_timeout(5000)      # Wait 5 seconds for locks
</span></span><span class="line"><span class="cl">_pragma=journal_mode(WAL)       # Write-ahead logging (required by Litestream)
</span></span><span class="line"><span class="cl">_pragma=synchronous(NORMAL)     # Balance safety and performance
</span></span><span class="line"><span class="cl">_pragma=foreign_keys(1)         # Enable foreign key constraints
</span></span><span class="line"><span class="cl">_pragma=cache_size(-64000)      # 64MB cache (negative = KB)
</span></span><span class="line"><span class="cl">_pragma=mmap_size(268435456)    # 256MB memory-mapped I/O
</span></span></code></pre></div><p>See the <a href="https://www.sqlite.org/pragma.html">SQLite PRAGMA documentation</a> for the complete list.</p>
<h4 id="troubleshooting-driver-issues">Troubleshooting Driver Issues</h4>
<p><strong>Error</strong>: <code>unknown pragma</code> or PRAGMA not taking effect</p>
<p><strong>Solution</strong>: Ensure you&rsquo;re using the <code>_pragma=name(value)</code> syntax, not the old <code>_name=value</code> syntax.</p>
<p><strong>Error</strong>: Build failures with cgo errors</p>
<p><strong>Solution</strong>: For v0.5.0+, you don&rsquo;t need cgo. Ensure <code>CGO_ENABLED=0</code> or simply don&rsquo;t set it (defaults work).</p>
<p><strong>Error</strong>: Performance differences after upgrade</p>
<p><strong>Solution</strong>: While <code>modernc.org/sqlite</code> is highly optimized, some workloads may see slight differences. If performance is critical, benchmark your specific use case. The pure Go implementation performs comparably to cgo for most workloads.</p>
<h2 id="configuration-migration-1">Configuration Migration</h2>
<h3 id="single-replica-vs-multiple-replicas">Single Replica vs Multiple Replicas</h3>
<p>The new configuration format uses a single <code>replica</code> field instead of a <code>replicas</code> array:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Multiple replicas (OLD - still supported)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replicas</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://primary-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://secondary-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">file</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/local/backup</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Single replica (NEW - recommended)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://primary-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db </span><span class="w"> </span><span class="c"># Separate entry for each replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://secondary-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">file</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/local/backup</span><span class="w">
</span></span></span></code></pre></div><h3 id="global-configuration-sections">Global Configuration Sections</h3>
<p>New global sections provide better control:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Global snapshot configuration</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">snapshot</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">168h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Global level-based retention</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">levels</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">5m</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">1h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">1h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">168h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Global exec hooks</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">exec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">cmd</span><span class="p">:</span><span class="w"> </span><span class="p">[</span><span class="s2">&#34;/usr/local/bin/notify&#34;</span><span class="p">,</span><span class="w"> </span><span class="s2">&#34;Litestream started&#34;</span><span class="p">]</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># Enable MCP server</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">mcp-addr</span><span class="p">:</span><span class="w"> </span><span class="s2">&#34;:3001&#34;</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-bucket/app</span><span class="w">
</span></span></span></code></pre></div><h2 id="replica-type-migration">Replica Type Migration</h2>
<h3 id="migrating-from-file-to-s3">Migrating from File to S3</h3>
<ol>
<li>
<p><strong>Prepare S3 bucket and credentials</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Create S3 bucket</span>
</span></span><span class="line"><span class="cl">aws s3 mb s3://my-litestream-backups
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Configure credentials</span>
</span></span><span class="line"><span class="cl">aws configure
</span></span></code></pre></div></li>
<li>
<p><strong>Update configuration</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># OLD: File replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># type: file  </span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># path: /backup/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># NEW: S3 replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://my-litestream-backups/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">region</span><span class="p">:</span><span class="w"> </span><span class="l">us-east-1</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Perform initial sync</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Stop current replication</span>
</span></span><span class="line"><span class="cl">sudo systemctl stop litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Start with new configuration</span>
</span></span><span class="line"><span class="cl">sudo systemctl start litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Verify replication</span>
</span></span><span class="line"><span class="cl">litestream databases
</span></span></code></pre></div></li>
</ol>
<h3 id="migrating-from-s3-to-nats">Migrating from S3 to NATS</h3>
<ol>
<li>
<p><strong>Set up NATS server with JetStream</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Start NATS with JetStream enabled</span>
</span></span><span class="line"><span class="cl">nats-server -js
</span></span></code></pre></div></li>
<li>
<p><strong>Update configuration</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># OLD: S3 replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># url: s3://my-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># NEW: NATS replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">nats</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">nats://localhost:4222/my-app-bucket</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Add authentication if needed</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">username</span><span class="p">:</span><span class="w"> </span><span class="l">litestream</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">password</span><span class="p">:</span><span class="w"> </span><span class="l">\${NATS_PASSWORD}</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Create NATS bucket</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Create JetStream bucket</span>
</span></span><span class="line"><span class="cl">nats stream create my-app-bucket <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>  --subjects<span class="o">=</span><span class="s2">&#34;my-app-bucket.&gt;&#34;</span> <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>  --storage<span class="o">=</span>file <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>  --retention<span class="o">=</span>limits <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>  --max-age<span class="o">=</span>168h
</span></span></code></pre></div></li>
</ol>
<h3 id="migrating-between-cloud-providers">Migrating Between Cloud Providers</h3>
<h4 id="s3-to-google-cloud-storage">S3 to Google Cloud Storage</h4>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># OLD: AWS S3</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># url: s3://aws-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># region: us-east-1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># NEW: Google Cloud Storage</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">gs://gcs-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Set up Application Default Credentials</span><span class="w">
</span></span></span></code></pre></div><h4 id="s3-to-azure-blob-storage">S3 to Azure Blob Storage</h4>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># OLD: AWS S3</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># url: s3://aws-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># NEW: Azure Blob Storage</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">abs://storage-account/container/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-name</span><span class="p">:</span><span class="w"> </span><span class="l">\${AZURE_STORAGE_ACCOUNT}</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">account-key</span><span class="p">:</span><span class="w"> </span><span class="l">\${AZURE_STORAGE_KEY}</span><span class="w">
</span></span></span></code></pre></div><h2 id="data-migration">Data Migration</h2>
<h3 id="copying-existing-backups">Copying Existing Backups</h3>
<p>When changing replica types, you may want to preserve existing backups:</p>
<ol>
<li>
<p><strong>Export current backups</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># List available LTX files</span>
</span></span><span class="line"><span class="cl">litestream ltx /var/lib/app.db
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Restore latest to temporary file</span>
</span></span><span class="line"><span class="cl">litestream restore -o /tmp/app-backup.db /var/lib/app.db
</span></span></code></pre></div></li>
<li>
<p><strong>Initialize new replica with existing data</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Stop replication</span>
</span></span><span class="line"><span class="cl">sudo systemctl stop litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Update configuration to new replica type</span>
</span></span><span class="line"><span class="cl"><span class="c1"># Start replication (will sync current database)</span>
</span></span><span class="line"><span class="cl">sudo systemctl start litestream
</span></span></code></pre></div></li>
</ol>
<h3 id="zero-downtime-migration">Zero-Downtime Migration</h3>
<p>For production systems requiring zero downtime:</p>
<ol>
<li>
<p><strong>Set up parallel replication</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="c"># Keep existing replica</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://old-bucket/app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="c"># Add new replica type  </span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">nats</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">nats://localhost:4222/new-bucket</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Monitor both replicas</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Watch replication status</span>
</span></span><span class="line"><span class="cl">watch -n <span class="m">5</span> <span class="s1">&#39;litestream databases&#39;</span>
</span></span></code></pre></div></li>
<li>
<p><strong>Switch over when new replica is synchronized</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="c"># Remove old replica, keep new one</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/app.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">nats</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">nats://localhost:4222/new-bucket</span><span class="w">
</span></span></span></code></pre></div></li>
</ol>
<h2 id="command-line-migration">Command-Line Migration</h2>
<h3 id="script-updates">Script Updates</h3>
<p>Update any scripts using deprecated commands:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="cp">#!/bin/bash
</span></span></span><span class="line"><span class="cl"><span class="cp"></span>
</span></span><span class="line"><span class="cl"><span class="c1"># OLD commands</span>
</span></span><span class="line"><span class="cl"><span class="c1"># litestream wal /var/lib/app.db</span>
</span></span><span class="line"><span class="cl"><span class="c1"># litestream databases -replica s3</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># NEW commands  </span>
</span></span><span class="line"><span class="cl">litestream ltx /var/lib/app.db
</span></span><span class="line"><span class="cl">litestream databases
</span></span></code></pre></div><h3 id="cron-job-updates">Cron Job Updates</h3>
<p>Update cron jobs and systemd timers:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># OLD cron job</span>
</span></span><span class="line"><span class="cl"><span class="c1"># 0 2 * * * litestream wal -path /var/lib/app.db</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># NEW cron job</span>
</span></span><span class="line"><span class="cl"><span class="m">0</span> <span class="m">2</span> * * * litestream ltx /var/lib/app.db
</span></span></code></pre></div><h2 id="testing-migration">Testing Migration</h2>
<h3 id="validation-steps">Validation Steps</h3>
<p>After migration, validate your setup:</p>
<ol>
<li>
<p><strong>Verify configuration</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream databases
</span></span></code></pre></div></li>
<li>
<p><strong>Test restore functionality</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -o /tmp/test-restore.db /var/lib/app.db
</span></span><span class="line"><span class="cl">sqlite3 /tmp/test-restore.db <span class="s2">&#34;PRAGMA integrity_check;&#34;</span>
</span></span></code></pre></div></li>
<li>
<p><strong>Monitor replication</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Watch for replication activity</span>
</span></span><span class="line"><span class="cl">tail -f /var/log/litestream.log
</span></span></code></pre></div></li>
</ol>
<h3 id="rollback-plan">Rollback Plan</h3>
<p>Always have a rollback plan:</p>
<ol>
<li>
<p><strong>Keep old binary available</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Quick rollback if needed</span>
</span></span><span class="line"><span class="cl">sudo cp /usr/local/bin/litestream.backup /usr/local/bin/litestream
</span></span><span class="line"><span class="cl">sudo cp /etc/litestream.yml.backup /etc/litestream.yml
</span></span><span class="line"><span class="cl">sudo systemctl restart litestream
</span></span></code></pre></div></li>
<li>
<p><strong>Restore from backup if needed</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -o /var/lib/app-recovered.db /var/lib/app.db
</span></span></code></pre></div></li>
</ol>
<h2 id="common-migration-issues-1">Common Migration Issues</h2>
<h3 id="configuration-validation-errors">Configuration Validation Errors</h3>
<p><strong>Error</strong>: <code>yaml: unmarshal errors</code>
<strong>Solution</strong>: Validate YAML syntax and check for unsupported options</p>
<h3 id="missing-dependencies">Missing Dependencies</h3>
<p><strong>Error</strong>: MCP server fails to start
<strong>Solution</strong>: Ensure all required ports are available and firewall rules permit access</p>
<h3 id="permission-issues">Permission Issues</h3>
<p><strong>Error</strong>: <code>permission denied</code> when accessing new replica locations<br>
<strong>Solution</strong>: Verify credentials and access permissions for new replica type</p>
<h2 id="getting-help">Getting Help</h2>
<h3 id="migration-support">Migration Support</h3>
<ul>
<li><strong>Documentation</strong>: <a href="https://litestream.io/reference/config/">Configuration Reference</a></li>
<li><strong>Issues</strong>: <a href="https://github.com/benbjohnson/litestream/issues">Report migration problems</a></li>
</ul>
<h3 id="professional-services">Professional Services</h3>
<p>For complex migrations or production environments, consider:</p>
<ul>
<li>Reviewing migration plan with the community</li>
<li>Testing in staging environment first</li>
<li>Planning maintenance windows for critical systems</li>
</ul>
<h2 id="next-steps">Next Steps</h2>
<p>After migration:</p>
<ul>
<li><a href="https://litestream.io/reference/mcp/">Enable MCP integration</a></li>
<li><a href="https://litestream.io/docs/troubleshooting/">Troubleshooting Guide</a></li>
<li><a href="https://litestream.io/reference/config/">Configuration Reference</a></li>
</ul>
`},{id:1,href:"https://litestream.io/docs/troubleshooting/",title:"Troubleshooting",description:"Common issues and solutions when using Litestream",content:`<h2 id="configuration-issues">Configuration Issues</h2>
<h3 id="invalid-configuration-file">Invalid Configuration File</h3>
<p><strong>Error</strong>: <code>yaml: unmarshal errors</code> or <code>cannot parse config</code></p>
<p><strong>Solution</strong>: Validate your YAML syntax:</p>
<ul>
<li>Check indentation (use spaces, not tabs)</li>
<li>Ensure proper nesting of configuration sections</li>
<li>Validate string values are properly quoted when containing special characters</li>
</ul>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># ❌ Invalid - mixed tabs and spaces</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c"># ✅ Valid - consistent spacing</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span></code></pre></div><h2 id="managing-credentials-securely">Managing Credentials Securely</h2>
<p>Properly securing credentials is critical for Litestream deployments. This section
covers best practices for credential management across different deployment scenarios.</p>
<h3 id="best-practices">Best Practices</h3>
<ol>
<li><strong>Never commit credentials to version control</strong> — Use <code>.gitignore</code> to exclude
configuration files containing sensitive data</li>
<li><strong>Prefer environment variables</strong> — Litestream supports environment variable
expansion in configuration files</li>
<li><strong>Use secret management systems</strong> — For production, use Kubernetes Secrets,
Docker Secrets, or HashiCorp Vault</li>
<li><strong>Minimize credential exposure</strong> — Provide only the permissions needed for your
use case (principle of least privilege)</li>
<li><strong>Rotate credentials regularly</strong> — Update access keys and secrets periodically</li>
<li><strong>Audit access</strong> — Monitor credential usage through cloud provider logs</li>
</ol>
<h3 id="environment-variable-expansion">Environment Variable Expansion</h3>
<p>Litestream automatically expands <code>$VAR</code> and <code>\${VAR}</code> references in configuration files.
This is the simplest way to pass credentials without embedding them in files:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/var/lib/mydb.db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://mybucket/db</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">access-key-id</span><span class="p">:</span><span class="w"> </span><span class="l">\${AWS_ACCESS_KEY_ID}</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">secret-access-key</span><span class="p">:</span><span class="w"> </span><span class="l">\${AWS_SECRET_ACCESS_KEY}</span><span class="w">
</span></span></span></code></pre></div><div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Set environment variables before running Litestream</span>
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AWS_ACCESS_KEY_ID</span><span class="o">=</span>AKIAIOSFODNN7EXAMPLE
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AWS_SECRET_ACCESS_KEY</span><span class="o">=</span>wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
</span></span><span class="line"><span class="cl">litestream replicate
</span></span></code></pre></div><p>To disable environment variable expansion if it conflicts with your values:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream replicate -no-expand-env
</span></span></code></pre></div><h3 id="kubernetes-secrets">Kubernetes Secrets</h3>
<p>For Kubernetes deployments, mount credentials as environment variables from Secrets:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">Secret</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-aws-credentials</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">Opaque</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">stringData</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">access-key-id</span><span class="p">:</span><span class="w"> </span><span class="l">AKIAIOSFODNN7EXAMPLE</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">secret-access-key</span><span class="p">:</span><span class="w"> </span><span class="l">wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nn">---</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">apps/v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">Deployment</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">myapp</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">template</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">containers</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">image</span><span class="p">:</span><span class="w"> </span><span class="l">myapp:latest</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">env</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">AWS_ACCESS_KEY_ID</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">valueFrom</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">            </span><span class="nt">secretKeyRef</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">              </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-aws-credentials</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">              </span><span class="nt">key</span><span class="p">:</span><span class="w"> </span><span class="l">access-key-id</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">AWS_SECRET_ACCESS_KEY</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">valueFrom</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">            </span><span class="nt">secretKeyRef</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">              </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-aws-credentials</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">              </span><span class="nt">key</span><span class="p">:</span><span class="w"> </span><span class="l">secret-access-key</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">volumeMounts</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">mountPath</span><span class="p">:</span><span class="w"> </span><span class="l">/etc/litestream</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">readOnly</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">volumes</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">configMap</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nn">---</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">ConfigMap</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">data</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">litestream.yml</span><span class="p">:</span><span class="w"> </span><span class="p">|</span><span class="sd">
</span></span></span><span class="line"><span class="cl"><span class="sd">    dbs:
</span></span></span><span class="line"><span class="cl"><span class="sd">      - path: /data/myapp.db
</span></span></span><span class="line"><span class="cl"><span class="sd">        replica:
</span></span></span><span class="line"><span class="cl"><span class="sd">          url: s3://mybucket/myapp
</span></span></span><span class="line"><span class="cl"><span class="sd">          access-key-id: \${AWS_ACCESS_KEY_ID}
</span></span></span><span class="line"><span class="cl"><span class="sd">          secret-access-key: \${AWS_SECRET_ACCESS_KEY}</span><span class="w">    
</span></span></span></code></pre></div><p>For GCS with workload identity (recommended for Kubernetes on GKE):</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">ServiceAccount</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-sa</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">annotations</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">iam.gke.io/gcp-service-account</span><span class="p">:</span><span class="w"> </span><span class="l">litestream@your-project.iam.gserviceaccount.com</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nn">---</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">apps/v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">Deployment</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">myapp</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">template</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">serviceAccountName</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-sa</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">containers</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">image</span><span class="p">:</span><span class="w"> </span><span class="l">myapp:latest</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">env</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">GOOGLE_APPLICATION_CREDENTIALS</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">value</span><span class="p">:</span><span class="w"> </span><span class="l">/var/run/secrets/cloud.google.com/service_account/key.json</span><span class="w">
</span></span></span></code></pre></div><h3 id="docker-secrets">Docker Secrets</h3>
<p>For Docker Swarm deployments, use Docker Secrets:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">version</span><span class="p">:</span><span class="w"> </span><span class="s1">&#39;3.8&#39;</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">services</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">myapp</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">image</span><span class="p">:</span><span class="w"> </span><span class="l">myapp:latest</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">environment</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">AWS_ACCESS_KEY_ID_FILE</span><span class="p">:</span><span class="w"> </span><span class="l">/run/secrets/aws_access_key_id</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">AWS_SECRET_ACCESS_KEY_FILE</span><span class="p">:</span><span class="w"> </span><span class="l">/run/secrets/aws_secret_access_key</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">secrets</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="l">aws_access_key_id</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="l">aws_secret_access_key</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">configs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">source</span><span class="p">:</span><span class="w"> </span><span class="l">litestream_config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">target</span><span class="p">:</span><span class="w"> </span><span class="l">/etc/litestream.yml</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">configs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">litestream_config</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">file</span><span class="p">:</span><span class="w"> </span><span class="l">./litestream.yml</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">secrets</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">aws_access_key_id</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">external</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">aws_secret_access_key</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">external</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span></code></pre></div><p>Then read these in your startup script:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="cp">#!/bin/sh
</span></span></span><span class="line"><span class="cl"><span class="cp"></span><span class="nb">export</span> <span class="nv">AWS_ACCESS_KEY_ID</span><span class="o">=</span><span class="k">$(</span>cat /run/secrets/aws_access_key_id<span class="k">)</span>
</span></span><span class="line"><span class="cl"><span class="nb">export</span> <span class="nv">AWS_SECRET_ACCESS_KEY</span><span class="o">=</span><span class="k">$(</span>cat /run/secrets/aws_secret_access_key<span class="k">)</span>
</span></span><span class="line"><span class="cl"><span class="nb">exec</span> litestream replicate
</span></span></code></pre></div><h3 id="azure-with-managed-identity">Azure with Managed Identity</h3>
<p>For Azure deployments, use managed identity instead of shared keys:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Pod with Azure managed identity</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">aad.banzaicloud.com/v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">AzureIdentity</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-identity</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="m">0</span><span class="w">  </span><span class="c"># Managed Service Identity</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">resourceID</span><span class="p">:</span><span class="w"> </span><span class="l">/subscriptions/{subscription}/resourcegroups/{resourcegroup}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/litestream</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">clientID</span><span class="p">:</span><span class="w"> </span>{<span class="l">client-id}</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nn">---</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">apps/v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">Deployment</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">myapp</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">template</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">labels</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">aadpodidbinding</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-identity</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">spec</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">containers</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">app</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">image</span><span class="p">:</span><span class="w"> </span><span class="l">myapp:latest</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">volumeMounts</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">mountPath</span><span class="p">:</span><span class="w"> </span><span class="l">/etc/litestream</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">readOnly</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">volumes</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span>- <span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">        </span><span class="nt">configMap</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">          </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nn">---</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">apiVersion</span><span class="p">:</span><span class="w"> </span><span class="l">v1</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">kind</span><span class="p">:</span><span class="w"> </span><span class="l">ConfigMap</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">metadata</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">name</span><span class="p">:</span><span class="w"> </span><span class="l">litestream-config</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">data</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">litestream.yml</span><span class="p">:</span><span class="w"> </span><span class="p">|</span><span class="sd">
</span></span></span><span class="line"><span class="cl"><span class="sd">    dbs:
</span></span></span><span class="line"><span class="cl"><span class="sd">      - path: /data/myapp.db
</span></span></span><span class="line"><span class="cl"><span class="sd">        replica:
</span></span></span><span class="line"><span class="cl"><span class="sd">          url: abs://account@myaccount.blob.core.windows.net/container/db
</span></span></span><span class="line"><span class="cl"><span class="sd">          # Managed identity authentication (no keys needed)</span><span class="w">    
</span></span></span></code></pre></div><h3 id="credential-security-checklist">Credential Security Checklist</h3>
<ul>
<li>✅ Credentials stored in environment variables or secret management systems</li>
<li>✅ Configuration files never committed to version control with credentials</li>
<li>✅ Credentials have minimal required permissions</li>
<li>✅ Access is logged and auditable</li>
<li>✅ Credentials rotated on a regular schedule</li>
<li>✅ Development and production credentials are separate</li>
<li>✅ Database backup location is restricted to authorized users</li>
<li>✅ Network access to cloud storage is restricted to necessary services</li>
</ul>
<h3 id="database-path-issues">Database Path Issues</h3>
<p><strong>Error</strong>: <code>no such file or directory</code> or <code>database is locked</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>Ensure the database path exists and is accessible</li>
<li>Check file permissions (Litestream needs read/write access)</li>
<li>Verify the database isn&rsquo;t being used by another process without proper <code>busy_timeout</code></li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-sql" data-lang="sql"><span class="line"><span class="cl"><span class="c1">-- Set busy timeout in your application
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="n">PRAGMA</span><span class="w"> </span><span class="n">busy_timeout</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="mi">5000</span><span class="p">;</span><span class="w">
</span></span></span></code></pre></div><h3 id="mcp-server-wont-start">MCP Server Won&rsquo;t Start</h3>
<p><strong>Error</strong>: <code>bind: address already in use</code></p>
<p><strong>Solution</strong>: Check if another process is using the MCP port:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check what&#39;s using port 3001</span>
</span></span><span class="line"><span class="cl">lsof -i :3001
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Use a different port in configuration</span>
</span></span><span class="line"><span class="cl">mcp-addr: <span class="s2">&#34;:3002&#34;</span>
</span></span></code></pre></div><h2 id="replication-issues">Replication Issues</h2>
<h3 id="s3-connection-failures">S3 Connection Failures</h3>
<p><strong>Error</strong>: <code>NoCredentialsProviders</code> or <code>access denied</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Verify AWS credentials are properly configured:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check AWS credentials</span>
</span></span><span class="line"><span class="cl">aws configure list
</span></span></code></pre></div></li>
<li>
<p>Ensure IAM permissions include required S3 actions:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-json" data-lang="json"><span class="line"><span class="cl"><span class="p">{</span>
</span></span><span class="line"><span class="cl">  <span class="nt">&#34;Version&#34;</span><span class="p">:</span> <span class="s2">&#34;2012-10-17&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">  <span class="nt">&#34;Statement&#34;</span><span class="p">:</span> <span class="p">[</span>
</span></span><span class="line"><span class="cl">    <span class="p">{</span>
</span></span><span class="line"><span class="cl">      <span class="nt">&#34;Effect&#34;</span><span class="p">:</span> <span class="s2">&#34;Allow&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">      <span class="nt">&#34;Action&#34;</span><span class="p">:</span> <span class="p">[</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;s3:GetObject&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;s3:PutObject&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;s3:DeleteObject&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;s3:ListBucket&#34;</span>
</span></span><span class="line"><span class="cl">      <span class="p">],</span>
</span></span><span class="line"><span class="cl">      <span class="nt">&#34;Resource&#34;</span><span class="p">:</span> <span class="p">[</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;arn:aws:s3:::your-bucket&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">        <span class="s2">&#34;arn:aws:s3:::your-bucket/*&#34;</span>
</span></span><span class="line"><span class="cl">      <span class="p">]</span>
</span></span><span class="line"><span class="cl">    <span class="p">}</span>
</span></span><span class="line"><span class="cl">  <span class="p">]</span>
</span></span><span class="line"><span class="cl"><span class="p">}</span>
</span></span></code></pre></div></li>
</ol>
<h3 id="s3-signature-errors">S3 Signature Errors</h3>
<p><strong>Error</strong>: <code>SignatureDoesNotMatch</code> or similar signature mismatch errors</p>
<p><strong>Solution</strong>:</p>
<p>This error typically occurs with Litestream versions prior to v0.5.5 when using
AWS S3 or certain S3-compatible providers.</p>
<ol>
<li>
<p><strong>Upgrade to v0.5.5 or later</strong> — The default <code>sign-payload</code> setting changed
from <code>false</code> to <code>true</code>, which resolves most signature issues.</p>
</li>
<li>
<p>If you cannot upgrade, explicitly enable payload signing:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">sign-payload</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Or via URL query parameter:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path?sign-payload=true</span><span class="w">
</span></span></span></code></pre></div></li>
</ol>
<h3 id="azure-blob-storage-permission-errors">Azure Blob Storage Permission Errors</h3>
<p><strong>Error</strong>: <code>AuthorizationPermissionMismatch</code> or <code>no matching backup files available</code></p>
<p>When using Microsoft Entra ID authentication (Managed Identity, Service Principal, or
Azure CLI), you must have the correct <strong>Storage Blob Data</strong> role assigned. Standard
Azure roles like Owner or Contributor manage the storage account but do <strong>not</strong> grant
access to blob data.</p>
<table>
<thead>
<tr>
<th>Error Message</th>
<th>Likely Cause</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>AuthorizationPermissionMismatch</code></td>
<td>Missing Storage Blob Data role</td>
</tr>
<tr>
<td><code>AuthorizationFailure</code></td>
<td>Authentication issue or wrong account</td>
</tr>
<tr>
<td><code>no matching backup files available</code></td>
<td>Often a permissions issue (prior to v0.5.7, the actual error was hidden)</td>
</tr>
</tbody>
</table>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Verify you have the correct role assigned:</p>
<table>
<thead>
<tr>
<th>Operation</th>
<th>Minimum Required Role</th>
</tr>
</thead>
<tbody>
<tr>
<td>Backup (write)</td>
<td>Storage Blob Data Contributor</td>
</tr>
<tr>
<td>Restore (read-only)</td>
<td>Storage Blob Data Reader</td>
</tr>
</tbody>
</table>
</li>
<li>
<p>Assign the role via Azure CLI:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">az role assignment create <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>    --role <span class="s2">&#34;Storage Blob Data Contributor&#34;</span> <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>    --assignee &lt;your-email-or-object-id&gt; <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>    --scope <span class="s2">&#34;/subscriptions/&lt;subscription-id&gt;/resourceGroups/&lt;resource-group&gt;/providers/Microsoft.Storage/storageAccounts/&lt;storage-account&gt;&#34;</span>
</span></span></code></pre></div></li>
<li>
<p>Wait up to 10 minutes for role assignments to take effect.</p>
</li>
<li>
<p>Verify your authentication is working:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># For Azure CLI auth</span>
</span></span><span class="line"><span class="cl">az login
</span></span><span class="line"><span class="cl">az storage blob list --account-name &lt;storage-account&gt; --container-name &lt;container&gt; --auth-mode login
</span></span></code></pre></div></li>
</ol>
<p>See the <a href="/guides/azure/#required-azure-roles">Azure Blob Storage guide</a> for detailed
role assignment instructions.</p>
<h3 id="nats-connection-issues">NATS Connection Issues</h3>
<p><strong>Error</strong>: <code>connection refused</code> or <code>authentication failed</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Verify NATS server is running and accessible:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Test NATS connectivity</span>
</span></span><span class="line"><span class="cl">nats server check --server nats://localhost:4222
</span></span></code></pre></div></li>
<li>
<p>Check authentication credentials:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">nats</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">nats://localhost:4222/bucket</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Use appropriate auth method</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">username</span><span class="p">:</span><span class="w"> </span><span class="l">user</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">password</span><span class="p">:</span><span class="w"> </span><span class="l">pass</span><span class="w">
</span></span></span></code></pre></div></li>
</ol>
<h3 id="s3-compatible-upload-errors">S3-Compatible Upload Errors</h3>
<p><strong>Error</strong>: <code>InvalidContentEncoding</code>, <code>MalformedTrailerError</code>, or similar errors
when uploading to S3-compatible providers</p>
<p><strong>Solution</strong>:</p>
<p>This error occurs with Litestream versions prior to v0.5.4 when using S3-compatible
providers (Tigris, Backblaze B2, MinIO, DigitalOcean Spaces, etc.). AWS SDK Go v2
v1.73.0+ introduced aws-chunked encoding that many providers don&rsquo;t support.</p>
<ol>
<li>
<p><strong>Upgrade to v0.5.4 or later</strong> — Litestream automatically disables aws-chunked
encoding for all S3-compatible providers.</p>
</li>
<li>
<p>See the <a href="/guides/s3-compatible/#upload-encoding-errors">S3-Compatible Guide</a>
for more details.</p>
</li>
</ol>
<h3 id="slow-replication">Slow Replication</h3>
<p><strong>Symptoms</strong>: High lag between database changes and replica updates</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Check sync intervals in configuration:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="c"># Reduce intervals for faster sync</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">monitor-interval</span><span class="p">:</span><span class="w"> </span><span class="l">1s</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">checkpoint-interval</span><span class="p">:</span><span class="w"> </span><span class="l">1m</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">sync-interval</span><span class="p">:</span><span class="w"> </span><span class="l">1s</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Monitor system resources (CPU, memory, network)</p>
</li>
<li>
<p>Consider using local file replica for testing performance</p>
</li>
</ol>
<h3 id="file-retention-and-cleanup-issues">File Retention and Cleanup Issues</h3>
<p><strong>Symptoms</strong>: LTX files accumulating in your S3 or R2 bucket despite having
retention configured, or files not being deleted as expected.</p>
<p>This section explains how Litestream&rsquo;s retention timing works and covers known
issues with certain S3-compatible providers.</p>
<h4 id="understanding-retention-timing">Understanding Retention Timing</h4>
<p>Litestream uses a tiered file structure for replicas. Understanding when each
file type is eligible for deletion helps diagnose retention issues:</p>
<table>
<thead>
<tr>
<th>File Type</th>
<th>Retention Trigger</th>
<th>Dependencies</th>
</tr>
</thead>
<tbody>
<tr>
<td><strong>L0 (WAL segments)</strong></td>
<td>After <code>l0-retention</code> (default 5m)</td>
<td>Must be compacted into L1 first</td>
</tr>
<tr>
<td><strong>L1/L2/L3 (compacted)</strong></td>
<td>When <code>EnforceSnapshotRetention()</code> runs</td>
<td>Snapshot age &gt; <code>retention</code></td>
</tr>
<tr>
<td><strong>L9 (snapshots)</strong></td>
<td>When snapshot age &gt; <code>retention</code></td>
<td>None</td>
</tr>
</tbody>
</table>
<p>The effective cleanup delay is approximately: <code>snapshot.interval</code> + <code>snapshot.retention</code></p>
<p><strong>Example timing with default configuration:</strong></p>
<ul>
<li>Configuration: <code>interval=30m</code> + <code>retention=1h</code></li>
<li>First snapshot created at T+30m (age: 0)</li>
<li>Second snapshot created at T+1h (first snapshot age: 30m)</li>
<li>First snapshot becomes eligible for deletion at T+1h30m (age exceeds 1h)</li>
<li><strong>Result</strong>: Minimum 1.5 hours before L1+ cleanup begins</li>
</ul>
<p>This means files will accumulate during this period. This is expected behavior,
not a bug. Note that retention enforcement only runs when Litestream creates a
new snapshot, not continuously in the background.</p>
<h4 id="verifying-retention-is-working">Verifying Retention Is Working</h4>
<p>Use Litestream&rsquo;s Prometheus metrics to monitor retention status:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-promql" data-lang="promql"><span class="line"><span class="cl"><span class="c1"># L0 file retention status (v0.5.x)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nv">litestream_l0_retention_files_total</span><span class="p">{</span><span class="nl">status</span><span class="o">=</span><span class="p">&#34;</span><span class="s">eligible</span><span class="p">&#34;}</span><span class="w">      </span><span class="c1"># Ready for deletion</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nv">litestream_l0_retention_files_total</span><span class="p">{</span><span class="nl">status</span><span class="o">=</span><span class="p">&#34;</span><span class="s">not_compacted</span><span class="p">&#34;}</span><span class="w"> </span><span class="c1"># Awaiting L1 compaction</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nv">litestream_l0_retention_files_total</span><span class="p">{</span><span class="nl">status</span><span class="o">=</span><span class="p">&#34;</span><span class="s">too_recent</span><span class="p">&#34;}</span><span class="w">    </span><span class="c1"># Within retention window</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c1"># S3/R2 operation tracking</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="kr">rate</span><span class="o">(</span><span class="nv">litestream_replica_operation_total</span><span class="p">{</span><span class="nl">operation</span><span class="o">=</span><span class="p">&#34;</span><span class="s">DELETE</span><span class="p">&#34;}[</span><span class="s">5m</span><span class="p">]</span><span class="o">)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nv">litestream_replica_operation_errors_total</span><span class="p">{</span><span class="nl">operation</span><span class="o">=</span><span class="p">&#34;</span><span class="s">DELETE</span><span class="p">&#34;}</span><span class="w">
</span></span></span></code></pre></div><p>If <code>DELETE</code> operations show errors or the <code>eligible</code> count keeps growing while
actual deletions don&rsquo;t occur, the issue may be with your storage provider.</p>
<h4 id="cloudflare-r2-silent-deletion-failures">Cloudflare R2 Silent Deletion Failures</h4>
<p>Cloudflare R2 has a known issue where <code>DeleteObjects</code> API calls may return
HTTP 200 with objects listed as &ldquo;Deleted&rdquo;, but the files are not actually
removed from storage. This is documented in <a href="https://community.cloudflare.com/t/r2-delete-objects-command-does-not-delete-objects/537479">Cloudflare Community forums</a>.</p>
<p><strong>Symptoms:</strong></p>
<ul>
<li>Litestream logs show successful deletions</li>
<li>Prometheus metrics show DELETE operations succeeding</li>
<li>Files remain in R2 bucket when checked manually</li>
</ul>
<p><strong>Verification:</strong></p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># After Litestream reports deletion, check if files still exist</span>
</span></span><span class="line"><span class="cl"><span class="c1"># Using rclone (configure R2 remote first):</span>
</span></span><span class="line"><span class="cl">rclone ls r2:your-bucket/path/to/replica <span class="p">|</span> grep <span class="s2">&#34;filename-that-should-be-deleted&#34;</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Or using AWS CLI with R2 endpoint:</span>
</span></span><span class="line"><span class="cl">aws s3 ls s3://your-bucket/path/to/replica <span class="se">\\
</span></span></span><span class="line"><span class="cl"><span class="se"></span>  --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com <span class="p">|</span> grep <span class="s2">&#34;filename&#34;</span>
</span></span></code></pre></div><p>If files that should have been deleted are still present, R2&rsquo;s silent deletion
bug is likely occurring.</p>
<h5 id="workaround-r2-object-lifecycle-rules">Workaround: R2 Object Lifecycle Rules</h5>
<p>Configure <a href="https://developers.cloudflare.com/r2/buckets/object-lifecycles/">R2 Object Lifecycle rules</a>
as a fallback cleanup mechanism:</p>
<ol>
<li>Go to <strong>Cloudflare Dashboard</strong> → <strong>R2</strong> → <strong>Your Bucket</strong> → <strong>Settings</strong></li>
<li>Click <strong>Object Lifecycle Rules</strong> → <strong>Add rule</strong></li>
<li>Configure:
<ul>
<li><strong>Rule name</strong>: <code>litestream-cleanup</code></li>
<li><strong>Prefix filter</strong>: Your Litestream replica path (e.g., <code>backups/mydb/</code>)</li>
<li><strong>Action</strong>: Delete objects</li>
<li><strong>Days after object creation</strong>: Set based on your retention needs (e.g., 7 days)</li>
</ul>
</li>
</ol>
<p>Example using AWS SDK:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-javascript" data-lang="javascript"><span class="line"><span class="cl"><span class="p">{</span>
</span></span><span class="line"><span class="cl">  <span class="nx">ID</span><span class="o">:</span> <span class="s2">&#34;litestream-cleanup&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">  <span class="nx">Status</span><span class="o">:</span> <span class="s2">&#34;Enabled&#34;</span><span class="p">,</span>
</span></span><span class="line"><span class="cl">  <span class="nx">Filter</span><span class="o">:</span> <span class="p">{</span> <span class="nx">Prefix</span><span class="o">:</span> <span class="s2">&#34;backups/mydb/&#34;</span> <span class="p">},</span>
</span></span><span class="line"><span class="cl">  <span class="nx">Expiration</span><span class="o">:</span> <span class="p">{</span> <span class="nx">Days</span><span class="o">:</span> <span class="mi">7</span> <span class="p">}</span>
</span></span><span class="line"><span class="cl"><span class="p">}</span>
</span></span></code></pre></div><p><strong>Important considerations:</strong></p>
<ul>
<li>Objects are typically removed within 24 hours of expiration</li>
<li>This is a fallback, not a replacement for Litestream&rsquo;s retention</li>
<li>Set lifecycle days higher than your Litestream retention to avoid premature deletion</li>
</ul>
<h4 id="r2-bucket-versioning">R2 Bucket Versioning</h4>
<p>If R2 bucket versioning is enabled, deleted objects become &ldquo;delete markers&rdquo;
rather than being permanently removed. Check your bucket settings:</p>
<ol>
<li><strong>Cloudflare Dashboard</strong> → <strong>R2</strong> → <strong>Your Bucket</strong> → <strong>Settings</strong></li>
<li>Look for <strong>Bucket versioning</strong> setting</li>
<li>If enabled, previous versions of objects are retained</li>
</ol>
<p>To clean up versioned objects, you may need to delete specific versions or
configure lifecycle rules that handle versioned objects.</p>
<h4 id="adjusting-retention-configuration">Adjusting Retention Configuration</h4>
<p>If files are accumulating faster than expected, consider adjusting your
retention settings. Snapshot and retention settings are configured globally,
not per-replica:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="c"># Global snapshot settings (not per-replica)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">snapshot</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">1h     </span><span class="w"> </span><span class="c"># How often to create snapshots</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">24h   </span><span class="w"> </span><span class="c"># How long to keep snapshots</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span></code></pre></div><p>Shorter <code>snapshot.interval</code> values create more frequent snapshots, which allows
older data to be cleaned up sooner. See the
<a href="/reference/config/#retention-period">Configuration Reference</a> for details on
how retention works.</p>
<h2 id="database-issues">Database Issues</h2>
<h3 id="wal-mode-problems">WAL Mode Problems</h3>
<p><strong>Error</strong>: <code>database is not in WAL mode</code></p>
<p><strong>Solution</strong>: Litestream requires WAL mode. Enable it in your application:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-sql" data-lang="sql"><span class="line"><span class="cl"><span class="c1">-- Enable WAL mode
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="n">PRAGMA</span><span class="w"> </span><span class="n">journal_mode</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="n">WAL</span><span class="p">;</span><span class="w">
</span></span></span></code></pre></div><p>Or let Litestream enable it automatically by ensuring proper database permissions.</p>
<h3 id="database-locks">Database Locks</h3>
<p><strong>Error</strong>: <code>database is locked</code> or <code>SQLITE_BUSY</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>Set busy timeout in your application (see above)</li>
<li>Ensure no long-running transactions are blocking checkpoints</li>
<li>Check for applications holding exclusive locks</li>
</ol>
<h3 id="wal-growth-and-checkpoint-blocking">WAL Growth and Checkpoint Blocking</h3>
<p><strong>Symptoms</strong>: WAL file growing excessively large or writes timing out</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Check if you have long-lived read transactions preventing checkpoints</p>
</li>
<li>
<p>Review checkpoint configuration in your config file</p>
</li>
<li>
<p>Consider disabling <code>truncate-page-n</code> if you have long-running queries:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">truncate-page-n</span><span class="p">:</span><span class="w"> </span><span class="m">0</span><span class="w">  </span><span class="c"># Disable blocking checkpoints</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Monitor WAL file size and disk space</p>
</li>
</ol>
<p>For detailed guidance on checkpoint configuration and trade-offs, see the <a href="/guides/wal-truncate-threshold">WAL
Truncate Threshold Configuration guide</a>.</p>
<h3 id="corruption-detection">Corruption Detection</h3>
<p><strong>Error</strong>: <code>database disk image is malformed</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Stop Litestream replication</p>
</li>
<li>
<p>Run SQLite integrity check:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">sqlite3 /path/to/db.sqlite <span class="s2">&#34;PRAGMA integrity_check;&#34;</span>
</span></span></code></pre></div></li>
<li>
<p>If corrupted, restore from latest backup:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -o /path/to/recovered.db /path/to/db.sqlite
</span></span></code></pre></div></li>
</ol>
<h2 id="performance-issues">Performance Issues</h2>
<h3 id="high-cpu-usage">High CPU Usage</h3>
<p><strong>Symptoms</strong>: Litestream consuming excessive CPU (100%+ sustained)</p>
<p><strong>Common Causes</strong>:</p>
<ol>
<li><strong>Unbounded WAL growth</strong> — Long-running read transactions blocking checkpoints</li>
<li><strong>State corruption</strong> — Tracking files mismatched with replica state</li>
<li><strong>Blocked checkpoints</strong> — Application holding read locks</li>
</ol>
<p><strong>Diagnosis</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check CPU usage over time</span>
</span></span><span class="line"><span class="cl">pidstat -p <span class="k">$(</span>pgrep litestream<span class="k">)</span> <span class="m">1</span> <span class="m">5</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Check WAL file size (large WAL indicates checkpoint blocking)</span>
</span></span><span class="line"><span class="cl">ls -lh /path/to/db.sqlite-wal
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Check for blocking processes</span>
</span></span><span class="line"><span class="cl">sqlite3 /path/to/db.sqlite <span class="s2">&#34;PRAGMA wal_checkpoint(PASSIVE);&#34;</span>
</span></span><span class="line"><span class="cl"><span class="c1"># Result: status|log|checkpointed</span>
</span></span><span class="line"><span class="cl"><span class="c1"># status=1 means checkpoint was blocked</span>
</span></span></code></pre></div><p><strong>Solutions</strong>:</p>
<ol>
<li>
<p><strong>Reduce monitoring frequency</strong>:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">monitor-interval</span><span class="p">:</span><span class="w"> </span><span class="l">10s</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># ... (other replica settings)</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">sync-interval</span><span class="p">:</span><span class="w"> </span><span class="l">5m</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Fix blocked checkpoints</strong> — Kill long-running read connections in your application</p>
</li>
<li>
<p><strong>Reset corrupted state</strong> — See <a href="#recovering-from-corrupted-tracking-state">Recovering from corrupted tracking state</a></p>
</li>
</ol>
<h3 id="memory-issues">Memory Issues</h3>
<p><strong>Symptoms</strong>: High memory usage or out-of-memory errors</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Monitor snapshot sizes and retention policies</p>
</li>
<li>
<p>Adjust retention settings:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">snapshot</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">interval</span><span class="p">:</span><span class="w"> </span><span class="l">24h</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">72h </span><span class="w"> </span><span class="c"># Keep fewer snapshots</span><span class="w">
</span></span></span></code></pre></div></li>
</ol>
<h2 id="network-and-connectivity">Network and Connectivity</h2>
<h3 id="intermittent-network-failures">Intermittent Network Failures</h3>
<p><strong>Error</strong>: <code>connection reset by peer</code> or <code>timeout</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Adjust sync interval to reduce frequency of requests during outages:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">sync-interval</span><span class="p">:</span><span class="w"> </span><span class="l">10s</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Check network stability and firewall rules</p>
</li>
<li>
<p>Consider using regional endpoints for cloud storage</p>
</li>
<li>
<p>For production, use a configuration file to persist your settings (see <a href="https://litestream.io/reference/config/">Configuration Reference</a>)</p>
</li>
</ol>
<h3 id="dns-resolution-issues">DNS Resolution Issues</h3>
<p><strong>Error</strong>: <code>no such host</code> or DNS timeouts</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Test DNS resolution:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">nslookup s3.amazonaws.com
</span></span></code></pre></div></li>
<li>
<p>Use IP addresses instead of hostnames if needed</p>
</li>
<li>
<p>Check <code>/etc/resolv.conf</code> configuration</p>
</li>
</ol>
<h2 id="logging-and-debugging">Logging and Debugging</h2>
<h3 id="enabling-debug-logging">Enabling Debug Logging</h3>
<p>Add debug logging to your configuration:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">logging</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">level</span><span class="p">:</span><span class="w"> </span><span class="l">debug</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">type</span><span class="p">:</span><span class="w"> </span><span class="l">text</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span><span class="nt">stderr</span><span class="p">:</span><span class="w"> </span><span class="kc">true</span><span class="w">
</span></span></span></code></pre></div><h3 id="reading-logs">Reading Logs</h3>
<p>Common log locations:</p>
<ul>
<li><strong>Linux systemd</strong>: <code>journalctl -u litestream</code></li>
<li><strong>Docker</strong>: <code>docker logs container_name</code></li>
<li><strong>Windows Service</strong>: Event Viewer → Application → Litestream</li>
<li><strong>Command Line</strong>: stdout/stderr</li>
</ul>
<h3 id="important-log-messages">Important Log Messages</h3>
<p>Look for these key messages:</p>
<ul>
<li><code>initialized db</code>: Database successfully loaded</li>
<li><code>replicating to</code>: Replica configuration loaded</li>
<li><code>sync error</code>: Replication issues</li>
<li><code>checkpoint completed</code>: Successful WAL checkpoint</li>
</ul>
<h2 id="recovery-and-restore">Recovery and Restore</h2>
<h3 id="point-in-time-recovery">Point-in-Time Recovery</h3>
<p>List available restore points:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream ltx /path/to/db.sqlite
</span></span></code></pre></div><p>Restore to specific time:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -timestamp 2025-01-01T12:00:00Z -o restored.db /path/to/db.sqlite
</span></span></code></pre></div><h3 id="backup-validation">Backup Validation</h3>
<p>Verify backup integrity:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Restore to temporary location</span>
</span></span><span class="line"><span class="cl">litestream restore -o /tmp/test.db /path/to/db.sqlite
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Run integrity check</span>
</span></span><span class="line"><span class="cl">sqlite3 /tmp/test.db <span class="s2">&#34;PRAGMA integrity_check;&#34;</span>
</span></span></code></pre></div><h2 id="operations-that-invalidate-tracking-state">Operations That Invalidate Tracking State</h2>
<p>Litestream maintains internal tracking state in <code>.{filename}-litestream</code> directories
(e.g., <code>.db.sqlite-litestream</code> for a database file named <code>db.sqlite</code>) to efficiently
replicate changes. Certain operations can corrupt or invalidate
this tracking, leading to high CPU usage, replication errors, or state mismatch
between local tracking and remote replicas.</p>
<h3 id="operations-to-avoid">Operations to avoid</h3>
<table>
<thead>
<tr>
<th>Operation</th>
<th>Why It&rsquo;s Problematic</th>
<th>Safe Alternative</th>
</tr>
</thead>
<tbody>
<tr>
<td>In-place <code>VACUUM</code></td>
<td>Rewrites entire database, invalidating page tracking</td>
<td>Use <code>VACUUM INTO 'new.db'</code></td>
</tr>
<tr>
<td>Manual checkpoint while Litestream is stopped</td>
<td>Large WAL changes database state without tracking</td>
<td>Let Litestream manage checkpoints</td>
</tr>
<tr>
<td>Deleting <code>.sqlite-litestream</code> directory</td>
<td>Creates local/remote state mismatch</td>
<td>Delete both local tracking AND remote replica</td>
</tr>
<tr>
<td>Restoring database while Litestream is running</td>
<td>Overwrites database without updating tracking</td>
<td>Stop Litestream before restore</td>
</tr>
</tbody>
</table>
<h3 id="in-place-vacuum">In-place VACUUM</h3>
<p>The SQLite <code>VACUUM</code> command rewrites the entire database file. Litestream tracks
changes at the page level, so a full rewrite invalidates all tracking state.</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-sql" data-lang="sql"><span class="line"><span class="cl"><span class="c1">-- Dangerous: Invalidates Litestream tracking
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="k">VACUUM</span><span class="p">;</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w"></span><span class="c1">-- Safe: Creates new file, preserves original
</span></span></span><span class="line"><span class="cl"><span class="c1"></span><span class="k">VACUUM</span><span class="w"> </span><span class="k">INTO</span><span class="w"> </span><span class="s1">&#39;/path/to/compacted.db&#39;</span><span class="p">;</span><span class="w">
</span></span></span></code></pre></div><p>If you must use in-place <code>VACUUM</code>:</p>
<ol>
<li>Stop Litestream</li>
<li>Run <code>VACUUM</code></li>
<li>Delete the <code>.sqlite-litestream</code> tracking directory</li>
<li>Delete the remote replica data (start fresh)</li>
<li>Restart Litestream</li>
</ol>
<h3 id="symptoms-of-corrupted-tracking-state">Symptoms of corrupted tracking state</h3>
<ul>
<li>
<p><strong>High CPU usage</strong> (100%+) even when database is idle</p>
</li>
<li>
<p><strong>Repeated log messages</strong> with identical transaction IDs</p>
</li>
<li>
<p><strong>&ldquo;timeout waiting for db initialization&rdquo;</strong> warnings</p>
</li>
<li>
<p><strong>Missing LTX file errors</strong>:</p>
<pre tabindex="0"><code>level=ERROR msg=&#34;monitor error&#34; error=&#34;open .../ltx/0/0000000000000001.ltx: no such file or directory&#34;
</code></pre></li>
<li>
<p><strong>Local/remote state mismatch</strong>:</p>
<pre tabindex="0"><code>level=INFO msg=&#34;detected database behind replica&#34; db_txid=0000000000000000 replica_txid=0000000000000001
</code></pre></li>
</ul>
<h2 id="recovering-from-corrupted-tracking-state">Recovering from Corrupted Tracking State</h2>
<p>When Litestream&rsquo;s tracking state becomes corrupted, a complete state reset is
required. This procedure removes all local tracking and remote replica data,
forcing a fresh snapshot.</p>
<div class="alert alert-warning d-flex" role="alert">
  <div class="flex-shrink-1 alert-icon">⚠️</div>
  <div class="w-100">**Warning**: This procedure deletes your replica history. You will lose the ability to do point-in-time recovery to timestamps before the reset. Only proceed if you have confirmed tracking corruption.</div>
</div>
<h3 id="recovery-procedure">Recovery procedure</h3>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># 1. Stop Litestream</span>
</span></span><span class="line"><span class="cl">sudo systemctl stop litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># 2. Kill any processes holding database connections</span>
</span></span><span class="line"><span class="cl"><span class="c1"># (application-specific - check for zombie processes)</span>
</span></span><span class="line"><span class="cl">lsof /path/to/db.sqlite
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># 3. Checkpoint the database to clear WAL</span>
</span></span><span class="line"><span class="cl">sqlite3 /path/to/db.sqlite <span class="s2">&#34;PRAGMA wal_checkpoint(TRUNCATE);&#34;</span>
</span></span><span class="line"><span class="cl"><span class="c1"># Verify: result should be &#34;0|0|0&#34; (success)</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># 4. Remove local Litestream tracking</span>
</span></span><span class="line"><span class="cl">rm -rf /path/to/.db.sqlite-litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># 5. Remove remote replica data (start fresh)</span>
</span></span><span class="line"><span class="cl"><span class="c1"># For S3:</span>
</span></span><span class="line"><span class="cl">aws s3 rm s3://bucket/path/db.sqlite --recursive
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># For GCS:</span>
</span></span><span class="line"><span class="cl">gsutil rm -r gs://bucket/path/db.sqlite
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># For Azure:</span>
</span></span><span class="line"><span class="cl">az storage blob delete-batch --source container --pattern <span class="s2">&#34;path/db.sqlite/*&#34;</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># 6. Restart Litestream</span>
</span></span><span class="line"><span class="cl">sudo systemctl start litestream
</span></span></code></pre></div><h3 id="verifying-recovery">Verifying recovery</h3>
<p>After restarting, verify Litestream has recovered:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check CPU usage is normal (should be near 0% when idle)</span>
</span></span><span class="line"><span class="cl">pidstat -p <span class="k">$(</span>pgrep litestream<span class="k">)</span> <span class="m">1</span> <span class="m">5</span>
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Check logs for successful snapshot</span>
</span></span><span class="line"><span class="cl">journalctl -u litestream -f
</span></span><span class="line"><span class="cl"><span class="c1"># Should see: &#34;snapshot written&#34; or similar</span>
</span></span></code></pre></div><h3 id="preventing-future-issues">Preventing future issues</h3>
<ol>
<li>
<p><strong>Avoid in-place VACUUM</strong> — Use <code>VACUUM INTO</code> instead</p>
</li>
<li>
<p><strong>Set busy timeout</strong> — Prevent checkpoint blocking:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-sql" data-lang="sql"><span class="line"><span class="cl"><span class="n">PRAGMA</span><span class="w"> </span><span class="n">busy_timeout</span><span class="w"> </span><span class="o">=</span><span class="w"> </span><span class="mi">5000</span><span class="p">;</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p><strong>Monitor WAL size</strong> — Alert if WAL exceeds 50% of database size</p>
</li>
<li>
<p><strong>Kill zombie connections</strong> — Ensure application processes don&rsquo;t hold long-lived read locks</p>
</li>
</ol>
<h2 id="getting-help">Getting Help</h2>
<h3 id="before-asking-for-help">Before Asking for Help</h3>
<ol>
<li><strong>Check the logs</strong> for error messages (use debug level)</li>
<li><strong>Test with minimal config</strong> to isolate the issue</li>
<li><strong>Verify versions</strong>: Ensure you&rsquo;re using compatible Litestream version</li>
<li><strong>Search existing issues</strong> on GitHub</li>
</ol>
<h3 id="where-to-get-help">Where to Get Help</h3>
<ul>
<li><strong>GitHub Issues</strong>: <a href="https://github.com/benbjohnson/litestream/issues">github.com/benbjohnson/litestream/issues</a></li>
<li><strong>Documentation</strong>: Review <a href="https://litestream.io/reference/config/">Configuration Reference</a></li>
</ul>
<h3 id="reporting-issues">Reporting Issues</h3>
<p>When reporting issues on GitHub, the bug report template will ask for:</p>
<ul>
<li><strong>Bug Description</strong>: Clear description of the issue</li>
<li><strong>Environment</strong>: Litestream version, operating system, installation method, storage backend</li>
<li><strong>Steps to Reproduce</strong>: Numbered steps, expected vs actual behavior</li>
<li><strong>Configuration</strong>: Your <code>litestream.yml</code> file (remove sensitive data)</li>
<li><strong>Logs</strong>: Relevant log output with debug level enabled</li>
<li><strong>Additional Context</strong>: Recent changes, related issues, workarounds attempted</li>
</ul>
<h2 id="sqlite-driver-issues-v050">SQLite Driver Issues (v0.5.0+)</h2>
<p><span class="badge badge-info litestream-version" title="This feature has been available since Litestream v0.5.0">
    v0.5.0
</span>
 Litestream migrated from <code>mattn/go-sqlite3</code> to <code>modernc.org/sqlite</code>. This section covers issues specific to this change.</p>
<h3 id="pragma-configuration-errors">PRAGMA Configuration Errors</h3>
<p><strong>Error</strong>: PRAGMAs not taking effect or <code>unknown pragma</code> errors</p>
<p><strong>Solution</strong>: v0.5.0+ uses different PRAGMA syntax in connection strings:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl"># OLD (v0.3.x - mattn/go-sqlite3):
</span></span><span class="line"><span class="cl">file:/path/to/db?_busy_timeout=5000
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"># NEW (v0.5.0+ - modernc.org/sqlite):
</span></span><span class="line"><span class="cl">file:/path/to/db?_pragma=busy_timeout(5000)
</span></span></code></pre></div><p>See the <a href="https://litestream.io/docs/migration/#sqlite-driver-migration">SQLite Driver Migration</a> guide for complete syntax.</p>
<h3 id="busy-timeout-not-working">Busy Timeout Not Working</h3>
<p><strong>Error</strong>: <code>SQLITE_BUSY</code> errors despite setting busy timeout</p>
<p><strong>Solution</strong>: Verify you&rsquo;re using the correct syntax for v0.5.0+:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-text" data-lang="text"><span class="line"><span class="cl"># Correct v0.5.0+ syntax
</span></span><span class="line"><span class="cl">?_pragma=busy_timeout(5000)
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"># Incorrect (v0.3.x syntax - won&#39;t work in v0.5.0+)
</span></span><span class="line"><span class="cl">?_busy_timeout=5000
</span></span></code></pre></div><h3 id="build-errors-with-cgo">Build Errors with CGO</h3>
<p><strong>Error</strong>: CGO-related build errors when building Litestream</p>
<p><strong>Solution</strong>: v0.5.0+ does not require cgo for the main binary:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Explicitly disable cgo if you&#39;re seeing cgo errors</span>
</span></span><span class="line"><span class="cl"><span class="nv">CGO_ENABLED</span><span class="o">=</span><span class="m">0</span> go build ./cmd/litestream
</span></span></code></pre></div><h3 id="performance-differences">Performance Differences</h3>
<p><strong>Symptoms</strong>: Different performance characteristics after upgrading</p>
<p><strong>Solution</strong>: While <code>modernc.org/sqlite</code> is highly optimized:</p>
<ol>
<li>Benchmark your specific workload if performance is critical</li>
<li>The pure Go driver performs comparably for most use cases</li>
<li>For VFS/experimental features, the cgo driver is still available</li>
</ol>
<h2 id="common-error-reference">Common Error Reference</h2>
<table>
<thead>
<tr>
<th>Error Message</th>
<th>Common Cause</th>
<th>Solution</th>
</tr>
</thead>
<tbody>
<tr>
<td><code>database is locked</code></td>
<td>No busy timeout set</td>
<td>Add <code>PRAGMA busy_timeout = 5000;</code></td>
</tr>
<tr>
<td><code>no such file or directory</code></td>
<td>Incorrect database path</td>
<td>Verify path exists and permissions</td>
</tr>
<tr>
<td><code>NoCredentialsProviders</code></td>
<td>Missing AWS credentials</td>
<td>Configure AWS credentials</td>
</tr>
<tr>
<td><code>SignatureDoesNotMatch</code></td>
<td>Unsigned payload (pre-v0.5.5)</td>
<td>Upgrade to v0.5.5+ or set <code>sign-payload: true</code></td>
</tr>
<tr>
<td><code>InvalidContentEncoding</code></td>
<td>aws-chunked encoding (pre-v0.5.4)</td>
<td>Upgrade to v0.5.4+ for S3-compatible providers</td>
</tr>
<tr>
<td><code>MalformedTrailerError</code></td>
<td>aws-chunked encoding (pre-v0.5.4)</td>
<td>Upgrade to v0.5.4+ for S3-compatible providers</td>
</tr>
<tr>
<td><code>AuthorizationPermissionMismatch</code> (Azure)</td>
<td>Missing Storage Blob Data role</td>
<td>Assign Storage Blob Data Contributor/Reader role</td>
</tr>
<tr>
<td><code>no matching backup files available</code> (Azure)</td>
<td>Permission issue (pre-v0.5.7)</td>
<td>Check Azure RBAC roles; upgrade to v0.5.7+ for better errors</td>
</tr>
<tr>
<td><code>connection refused</code></td>
<td>Service not running</td>
<td>Check if target service is accessible</td>
</tr>
<tr>
<td><code>yaml: unmarshal errors</code></td>
<td>Invalid YAML syntax</td>
<td>Validate configuration file syntax</td>
</tr>
<tr>
<td><code>bind: address already in use</code></td>
<td>Port conflict</td>
<td>Change MCP port or stop conflicting service</td>
</tr>
<tr>
<td>PRAGMA not taking effect</td>
<td>Wrong syntax for v0.5.0+</td>
<td>Use <code>_pragma=name(value)</code> syntax</td>
</tr>
<tr>
<td>LTX files accumulating (R2)</td>
<td>R2 silent deletion bug</td>
<td>Use R2 Object Lifecycle rules as fallback</td>
</tr>
<tr>
<td>Files not deleted despite retention</td>
<td>Retention timing or provider bug</td>
<td>Check retention timing math; verify deletions</td>
</tr>
</tbody>
</table>
<h2 id="next-steps">Next Steps</h2>
<ul>
<li><a href="https://litestream.io/reference/config/">Configuration Reference</a></li>
<li><a href="https://litestream.io/install/">Installation Guide</a></li>
<li><a href="https://litestream.io/getting-started/">Getting Started</a></li>
<li><a href="https://litestream.io/tips/">Tips &amp; Caveats</a></li>
</ul>
`},{id:2,href:"https://litestream.io/docs/",title:"Documentation",description:"",content:""}];e.add(n),userinput.addEventListener("input",s,!0),suggestions.addEventListener("click",o,!0);function s(){var n,i=this.value,s=e.search(i,5),o=suggestions.childNodes,r=0,c=s.length;for(suggestions.classList.remove("d-none"),s.forEach(function(e){n=document.createElement("div"),n.innerHTML="<a href><span></span><span></span></a>",a=n.querySelector("a"),t=n.querySelector("span:first-child"),d=n.querySelector("span:nth-child(2)"),a.href=e.href,t.textContent=e.title,d.textContent=e.description,suggestions.appendChild(n)});o.length>c;)suggestions.removeChild(o[r])}function o(){for(;suggestions.lastChild;)suggestions.removeChild(suggestions.lastChild);return!1}})()
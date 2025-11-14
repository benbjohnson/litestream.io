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
</span></span><span class="line"><span class="cl">wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Extract and install</span>
</span></span><span class="line"><span class="cl">tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">sudo mv litestream /usr/local/bin/
</span></span><span class="line"><span class="cl">sudo chmod +x /usr/local/bin/litestream
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># Verify installation</span>
</span></span><span class="line"><span class="cl">litestream version
</span></span></code></pre></div><h3 id="upgrading-from-v03x-to-v050">Upgrading from v0.3.x to v0.5.0+</h3>
<h4 id="key-changes">Key Changes</h4>
<ol>
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
</span></span></span></code></pre></div><ol start="2">
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
</span></span></span></code></pre></div><ol start="3">
<li><strong>Update command usage</strong>:</li>
</ol>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># OLD: Query WAL information</span>
</span></span><span class="line"><span class="cl">litestream wal /path/to/db.sqlite
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># NEW: Query LTX information  </span>
</span></span><span class="line"><span class="cl">litestream ltx /path/to/db.sqlite
</span></span></code></pre></div><ol start="4">
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
<p><strong>Option 1: Stay on v0.3.x</strong></p>
<p>If you need Age encryption, remain on v0.3.x until the feature is restored:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl"><span class="c1"># Check your current version</span>
</span></span><span class="line"><span class="cl">litestream version
</span></span><span class="line"><span class="cl">
</span></span><span class="line"><span class="cl"><span class="c1"># If you&#39;ve already upgraded to v0.5, downgrade to latest v0.3</span>
</span></span><span class="line"><span class="cl">wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">tar -xzf litestream-v0.3.13-linux-amd64.tar.gz
</span></span><span class="line"><span class="cl">sudo mv litestream /usr/local/bin/
</span></span><span class="line"><span class="cl">sudo systemctl restart litestream
</span></span></code></pre></div><p><strong>Option 2: Upgrade to v0.5.0+ (Remove Age Encryption)</strong></p>
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
<p><strong>Option 3: Use Unencrypted Backups Temporarily</strong></p>
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
</span></span></code></pre></div><h2 id="configuration-migration">Configuration Migration</h2>
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
<h2 id="common-migration-issues">Common Migration Issues</h2>
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
<li><strong>Community</strong>: <a href="https://github.com/benbjohnson/litestream/discussions">GitHub Discussions</a></li>
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
</span></span></span></code></pre></div><h3 id="database-path-issues">Database Path Issues</h3>
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
<h3 id="corruption-detection">Corruption Detection</h3>
<p><strong>Error</strong>: <code>database disk image is malformed</code></p>
<p><strong>Solution</strong>:</p>
<ol>
<li>Stop Litestream replication</li>
<li>Run SQLite integrity check:
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">sqlite3 /path/to/db.sqlite <span class="s2">&#34;PRAGMA integrity_check;&#34;</span>
</span></span></code></pre></div></li>
<li>If corrupted, restore from latest backup:
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">litestream restore -o /path/to/recovered.db /path/to/db.sqlite
</span></span></code></pre></div></li>
</ol>
<h2 id="performance-issues">Performance Issues</h2>
<h3 id="high-cpu-usage">High CPU Usage</h3>
<p><strong>Symptoms</strong>: Litestream consuming excessive CPU</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>
<p>Increase monitoring intervals:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">monitor-interval</span><span class="p">:</span><span class="w"> </span><span class="l">10s </span><span class="w"> </span><span class="c"># Reduce frequency</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Check for database hotspots (frequent small transactions)</p>
</li>
<li>
<p>Consider batch operations in your application</p>
</li>
</ol>
<h3 id="memory-issues">Memory Issues</h3>
<p><strong>Symptoms</strong>: High memory usage or out-of-memory errors</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>Monitor snapshot sizes and retention policies</li>
<li>Adjust retention settings:
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
<p>Implement retry logic in replica configuration:</p>
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-yaml" data-lang="yaml"><span class="line"><span class="cl"><span class="nt">dbs</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">  </span>- <span class="nt">path</span><span class="p">:</span><span class="w"> </span><span class="l">/path/to/db.sqlite</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">    </span><span class="nt">replica</span><span class="p">:</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">url</span><span class="p">:</span><span class="w"> </span><span class="l">s3://bucket/path</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="c"># Add connection tuning</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">sync-interval</span><span class="p">:</span><span class="w"> </span><span class="l">10s</span><span class="w">
</span></span></span><span class="line"><span class="cl"><span class="w">      </span><span class="nt">retention</span><span class="p">:</span><span class="w"> </span><span class="l">168h</span><span class="w">
</span></span></span></code></pre></div></li>
<li>
<p>Check network stability and firewall rules</p>
</li>
<li>
<p>Consider using regional endpoints for cloud storage</p>
</li>
</ol>
<h3 id="dns-resolution-issues">DNS Resolution Issues</h3>
<p><strong>Error</strong>: <code>no such host</code> or DNS timeouts</p>
<p><strong>Solution</strong>:</p>
<ol>
<li>Test DNS resolution:
<div class="highlight"><pre tabindex="0" class="chroma"><code class="language-bash" data-lang="bash"><span class="line"><span class="cl">nslookup s3.amazonaws.com
</span></span></code></pre></div></li>
<li>Use IP addresses instead of hostnames if needed</li>
<li>Check <code>/etc/resolv.conf</code> configuration</li>
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
</span></span></code></pre></div><h2 id="getting-help">Getting Help</h2>
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
<li><strong>GitHub Discussions</strong>: <a href="https://github.com/benbjohnson/litestream/discussions">github.com/benbjohnson/litestream/discussions</a></li>
<li><strong>Slack Community</strong>: <a href="https://join.slack.com/t/litestream/shared_invite/zt-3ed89j5s4-KODYR5v93N_0vHE_kDWCyg">Join Litestream Slack</a></li>
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
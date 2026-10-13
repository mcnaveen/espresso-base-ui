// The document the design file shows in its editor (espresso-2.0 › WYSIWYG
// editor, 30534:59617): the Frappe article, block by block — headings,
// lists, links, a quote, rules, a table, a code block, images, coloured and
// highlighted text, a video, a checklist, strike, sub- and superscript.
// (The source's mentions, audio, attachments, callouts, toggles and column
// layouts ride on its own custom extensions and are left out here.)
export const article = `
<h1>Building Better Software with Frappe</h1>
<p>Modern businesses need software that adapts to their processes instead of forcing teams to change the way they work. At Frappe, we believe that business software should be flexible, transparent, and accessible to organizations of all sizes.</p>
<p></p>
<p>For more than a decade, Frappe has been building open-source products that help businesses manage operations, collaborate effectively, and scale with confidence. From startups managing their first customers to enterprises handling complex workflows, thousands of organizations rely on Frappe-powered applications every day.</p>
<p></p>
<p>Most business software begins with a simple promise: make work easier. Over time, however, many systems become difficult to customize, expensive to maintain, and disconnected from the unique needs of the organizations that use them.</p>
<p></p>
<p>Frappe takes a different approach.</p>
<p></p>
<p>By combining open-source principles with modern <a href="https://frappe.io/design">Product design,</a> Frappe enables businesses to build workflows that fit their operations rather than forcing operations to fit the software.</p>
<h3>Core Principles</h3>
<ul>
  <li><p>Open by default</p></li>
  <li><p>Built for customization</p></li>
  <li><p>Developer-friendly architecture</p></li>
  <li><p>Human-centered design</p></li>
  <li><p>Community-driven innovation</p></li>
  <li><p>Long-term sustainability</p></li>
</ul>
<p></p>
<blockquote><p><em>“Software should empower organisation to innovate, not limit them”</em></p></blockquote>
<hr>
<h2>A Framework Designed for Rapid Development</h2>
<p>The Frappe Framework is a full-stack web application framework that allows developers to build robust business applications with remarkable speed.</p>
<p></p>
<p>Instead of spending months creating common infrastructure such as authentication systems, permission management, dashboards, reporting tools, and APIs, developers can focus <mark style="background-color: var(--color-yellow-100)">on solving</mark> real business problems.</p>
<h3>Key Features</h3>
<ol>
  <li><p>Metadata-driven architecture</p></li>
  <li><p>REST and GraphQL APIs</p></li>
  <li><p>Background job processing</p></li>
  <li><p>Workflow automation</p></li>
  <li><p>Role-based permissions</p></li>
  <li><p>Real-time updates</p></li>
  <li><p>Responsive user interface</p></li>
</ol>
<hr>
<h2>From Framework to Ecosystem</h2>
<p>What started as a framework has evolved into a complete ecosystem of applications serving organizations across industries.</p>
<table>
  <tbody>
    <tr><th><p>Product</p></th><th><p>Purpose</p></th><th><p>Primary Users</p></th></tr>
    <tr><td><p>ERPNext</p></td><td><p>Enterprise Resource Planning</p></td><td><p>Small to Large Businesses</p></td></tr>
    <tr><td><p>Frappe CRM</p></td><td><p>Customer Relationship Manager</p></td><td><p>Sales Teams</p></td></tr>
    <tr><td><p>Frappe Helpdesk</p></td><td><p>Customer Support Operations</p></td><td><p>Support Teams</p></td></tr>
    <tr><td><p>Frappe HR</p></td><td><p>Human Resource Management</p></td><td><p>HR Departments</p></td></tr>
    <tr><td><p>Frappe LMS</p></td><td><p>Learning Management System</p></td><td><p>Educators &amp; Training Teams</p></td></tr>
    <tr><td><p>Frappe Drive</p></td><td><p>Document Management &amp; Collaboration</p></td><td><p>All Teams</p></td></tr>
  </tbody>
</table>
<p></p>
<hr>
<h2>Code Block</h2>
<pre><code class="language-python">import frappe


def welcome(user):
    """Greet a user and list the tickets waiting on them."""
    name = frappe.db.get_value("User", user, "full_name") or user
    print(f"Welcome to Frappe, {name}!")</code></pre>
<hr>
<h2>Frappe Team</h2>
<img src="/images/rte/team-3.jpg" alt="Frappeverse 2023 group photo">
<img src="/images/rte/team-1.jpg" alt="Frappeverse talk">
<hr>
<h2>The Frappe Ecosystem</h2>
<p><span style="color: var(--color-pink-600)">The Frappe ecosystem is built around the idea that businesses should own and control their software rather than being locked into rigid proprietary systems. By providing open-source tools and platforms, Frappe enables organizations to customize solutions according to their processes.</span></p>
<p></p>
<p>This balance creates a collaborative environment where business teams and developers can work together to continuously improve processes. <s>Instead of viewing software as a fixed product</s>, organizations can treat it as a platform for ongoing innovation.</p>
<p></p>
<blockquote><p><em>“The success of Frappe is closely tied to its global community. Thousands of contributors across different countries actively participate in the ecosystem.”</em></p></blockquote>
<hr>
<h2>Designed for Modern Organizations</h2>
<div data-youtube-video><iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" title="Big Buck Bunny"></iframe></div>
<a data-attachment href="#" data-file-name="Default ticket type" data-file-size="12288" data-mime-type="text/plain">Default ticket type</a>
<a data-attachment href="#" data-file-name="Supply_update.doc" data-file-size="49152" data-mime-type="application/msword">Supply_update.doc</a>
<a data-attachment href="#" data-file-name="Frappe logos.zip" data-file-size="2202009" data-mime-type="application/zip">Frappe logos.zip</a>
<hr>
<h2>Product Launch Checklist</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Define project requirements</p></li>
  <li data-type="taskItem" data-checked="true"><p>Create wireframes</p></li>
  <li data-type="taskItem" data-checked="false"><p>Design core components</p></li>
  <li data-type="taskItem" data-checked="false"><p>Review design system guidelines</p></li>
  <li data-type="taskItem" data-checked="false"><p>Complete accessibility audit</p></li>
  <li data-type="taskItem" data-checked="false"><p>Launch beta release</p></li>
</ul>
<hr>
<h2>The Frappe Podcast</h2>
<p>Learn more about all components from the <strong>Frappe</strong></p>
<audio src="/images/rte/sample.wav" title="Frappe podcast"></audio>
<hr>
<h2>Design Team Contributions</h2>
<p>The initial design system was developed by <span class="mention" data-type="mention" data-id="shruti" data-label="Shruti">@Shruti</span> and <span class="mention" data-type="mention" data-id="harsha" data-label="Harsha">@Harsha</span> who focused on creating a scalable component architecture. Over time, the system evolved through contributions from <span class="mention" data-type="mention" data-id="jayaprakash" data-label="Jayaprakash">@Jayaprakash</span> <span class="mention" data-type="mention" data-id="gowtham" data-label="Gowtham">@Gowtham</span> and other team members.</p>
<hr>
<h2>Callouts</h2>
<div data-type="callout" data-emoji="💡"><p><strong>Tip</strong></p><p>Frappe applications are highly customisable. Before creating custom features, explore existing workflows, custom fields, and automation tools.</p></div>
<div data-type="callout" data-emoji="🚀"><p><strong>Getting Started</strong></p><p>New to Frappe? Begin with ERPNext to understand the platform's capabilities, then explore the Framework.</p></div>
<div data-type="callout" data-emoji="📅"><p><strong>Upcoming Release</strong></p><p>The next release will focus on performance improvements and accessibility enhancements.</p></div>
<hr>
<h2>Expand/Collapse</h2>
<details><summary>ERP Next</summary><div data-type="details-content"><p>ERPNext brings accounting, sales, purchasing, inventory, manufacturing and HR into one platform.</p></div></details>
<details><summary>Framework</summary><div data-type="details-content"><p>A full-stack web application framework for building business apps at speed.</p></div></details>
<details open><summary>Drive</summary><div data-type="details-content"><p>Frappe Drive is an open-source, self-hosted cloud storage and file management platform.</p></div></details>
<details><summary>Frappe CRM</summary><div data-type="details-content"><p>Leads, deals and pipelines with a streamlined, collaborative workflow.</p></div></details>
<hr>
<h2>Super and Subscript</h2>
<ul>
  <li><p>X<sup>2</sup></p></li>
  <li><p>10<sup>3</sup></p></li>
  <li><p>m<sup>2</sup></p></li>
  <li><p>H<sub>2</sub>O</p></li>
  <li><p>CO<sub>2</sub></p></li>
</ul>
<hr>
<h2>Multi-column layout</h2>
<div data-type="columns" data-count="2">
  <div data-type="column"><p>Frappe CRM helps businesses manage leads, customers, and sales opportunities from a single platform. Track every interaction, automate repetitive tasks, and close deals faster with a streamlined, collaborative workflow.</p></div>
  <div data-type="column"><p>Frappe Helpdesk enables teams to deliver fast, efficient customer support from a unified workspace. Manage tickets, automate workflows, track SLAs, and resolve issues seamlessly with powerful collaboration tools.</p></div>
</div>
<p></p>
`

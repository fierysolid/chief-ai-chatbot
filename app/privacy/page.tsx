import React from 'react';

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-neutral dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p>Effective Date: June 2024</p>
      <p>
        This Privacy Policy describes how Sched Tech (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects, uses, and discloses your information when you use our website and services, including scheduling events using the Google Calendar API.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li><strong>Account Information:</strong> When you register, we collect your email address and password. Guest users may be assigned a unique identifier with minimal data.</li>
        <li><strong>Chat and Document Data:</strong> We store your chat messages, chat titles, attachments, documents, and suggestions you create or interact with on our platform.</li>
        <li><strong>Geolocation Data:</strong> We may collect your approximate location (city, country, latitude, longitude) to provide certain features, such as weather information.</li>
        <li><strong>Google Calendar Data:</strong> If you choose to connect your Google account, we access your Google Calendar to schedule events on your behalf. We only access, use, and store the minimum data necessary to provide this functionality, in accordance with your permissions.</li>
        <li><strong>Usage Data:</strong> We may collect information about how you use our services, including log data, device information, and cookies.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide, maintain, and improve our services.</li>
        <li>To authenticate users and manage accounts.</li>
        <li>To store and retrieve your chats, documents, and scheduled events.</li>
        <li>To schedule events on your Google Calendar, with your explicit consent.</li>
        <li>To communicate with you about your account or our services.</li>
        <li>To comply with legal obligations and enforce our terms.</li>
      </ul>

      <h2>3. How We Share Your Information</h2>
      <ul>
        <li>We do <strong>not</strong> sell your personal information.</li>
        <li>We may share your information with service providers (such as hosting, analytics, and database providers) who assist us in operating our services.</li>
        <li>We may disclose information if required by law or to protect our rights and the safety of our users.</li>
      </ul>

      <h2>4. Google Calendar API</h2>
      <p>
        Our application uses the Google Calendar API to schedule events on your behalf. By connecting your Google account, you grant us access to your calendar as permitted by you. We only use this access to create, modify, or delete events as you request. We do not access or store your calendar data beyond what is necessary to provide this functionality.
      </p>
      <p>
        We comply with the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
      </p>

      <h2>5. Data Security</h2>
      <p>
        We implement reasonable security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h2>6. Your Rights and Choices</h2>
      <ul>
        <li>You may access, update, or delete your account information at any time.</li>
        <li>You may revoke our access to your Google Calendar via your Google account settings.</li>
        <li>You may request deletion of your data by contacting us at <a href="mailto:schoen.jordan@gmail.com">schoen.jordan@gmail.com</a>.</li>
      </ul>

      <h2>7. Children&apos;s Privacy</h2>
      <p>
        Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13.
      </p>

      <h2>8. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page with a new effective date.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have any questions or concerns about this Privacy Policy or our data practices, please contact us at <a href="mailto:schoen.jordan@gmail.com">schoen.jordan@gmail.com</a>.
      </p>
    </div>
  );
} 
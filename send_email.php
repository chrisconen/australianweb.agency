<?php

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    // Honeypot check (spam protection)
    if (!empty($_POST["honeypot"])) {
        header("Location: contact.html?error=Spam detected");
        exit;
    }
    
    $name = strip_tags(trim($_POST["name"]));
    $company = strip_tags(trim($_POST["company"]));
    $phone = strip_tags(trim($_POST["phone"]));
    $email = strip_tags(trim($_POST["email"]));
    $service = strip_tags(trim($_POST["service"]));
    $uzenet = strip_tags(trim($_POST["uzenet"]));
    
    // reCAPTCHA v3 verification
    // TODO: Replace with your actual reCAPTCHA v3 secret key for australianweb.agency
    $recaptchaSecretKey = "6LdTGiMsAAAAAO3aEQq1-5LbOVVsIQq3Tl_NdSfv";
    $recaptchaResponse = $_POST['recaptcha_response'] ?? '';

    // Only verify if reCAPTCHA response is provided
    if (!empty($recaptchaResponse)) {
        $recaptchaUrl = 'https://www.google.com/recaptcha/api/siteverify';
        $recaptchaData = [
            'secret' => $recaptchaSecretKey,
            'response' => $recaptchaResponse
        ];
        
        $options = [
            'http' => [
                'method' => 'POST',
                'content' => http_build_query($recaptchaData)
            ]
        ];
        $context = stream_context_create($options);
        $verify = file_get_contents($recaptchaUrl, false, $context);
        $responseData = json_decode($verify);

        if (!$responseData->success || $responseData->score < 0.5) {
            header("Location: contact.html?error=reCAPTCHA verification failed");
            exit;
        }
    }

    // Validate required fields
    if (empty($name) || empty($phone) || empty($email) || empty($service) || empty($uzenet)) {
        header("Location: contact.html?error=Please fill in all required fields");
        exit;
    }

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        header("Location: contact.html?error=Invalid email address");
        exit;
    }

    // Service names mapping
    $serviceNames = [
        'website_design' => 'Website Design',
        'webshop' => 'Webshop Development',
        'seo' => 'SEO Optimisation',
        'branding' => 'Branding & Logo',
        '3d' => '3D Visualisation',
        'other' => 'Other'
    ];
    $serviceName = $serviceNames[$service] ?? $service;

    // Email settings
    $to = "info@australianweb.agency";
    $subject = "New enquiry from Australian Web Agency website";
    
    $body = "You have received a new enquiry from your website:\n\n";
    $body .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
    $body .= "Name: $name\n";
    $body .= "Company: " . ($company ?: "Not provided") . "\n";
    $body .= "Phone: $phone\n";
    $body .= "Email: $email\n";
    $body .= "Service: $serviceName\n\n";
    $body .= "Message:\n$uzenet\n\n";
    $body .= "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
    $body .= "Sent from: australianweb.agency contact form\n";
    $body .= "Time: " . date("Y-m-d H:i:s") . " AEST\n";
    
    $headers = "From: noreply@australianweb.agency\r\n";
    $headers .= "Reply-To: $email\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();

    if (mail($to, $subject, $body, $headers)) {
        header("Location: contact.html?success=1");
    } else {
        header("Location: contact.html?error=Failed to send message. Please try again or email us directly.");
    }
} else {
    header("Location: contact.html");
}
?>
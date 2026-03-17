/**
 * siteContent.js — Editable static content for the CHQI public website.
 * Edit the values here to update text, stats, mission, values, and contact info.
 * Researcher profiles are managed through the Settings panel in the dashboard (stored in the database).
 */

export const institution = {
    name: 'Centre for Healthcare Quality and Innovation',
    shortName: 'CHQI',
    tagline: 'Advancing Healthcare Through Evidence-Based Research',
    description: `The Centre for Healthcare Quality and Innovation (CHQI) is a leading research institution 
    dedicated to transforming healthcare delivery through rigorous scientific inquiry, quality improvement, 
    and collaborative innovation. We bridge the gap between research evidence and clinical practice to 
    improve patient outcomes across East Africa and beyond.`,
    aboutDetail: `Founded with a commitment to excellence, CHQI brings together multidisciplinary researchers, 
    clinicians, and policy experts to address the most pressing challenges in healthcare quality. Our work spans 
    health systems strengthening, patient safety, digital health innovation, and health equity — always guided 
    by data, driven by impact.`,
    logoPath: '/assets/logo.png',        // path to your logo in /public/assets/
    heroImage: null,                      // optional: path to a hero background image
};

export const stats = [
    { value: '5+', label: 'Active Research Projects' },
    { value: '20+', label: 'Expert Researchers' },
    { value: '120+', label: 'Publications' },
    { value: '10+', label: 'Years of Excellence' },
];

export const mission = {
    statement: `To generate and apply high-quality evidence that improves healthcare delivery, 
    strengthens health systems, and advances health equity for all people.`,
    vision: `A world where every person receives safe, effective, and compassionate care, 
    supported by robust research and continuous quality improvement.`,
};

export const values = [
    {
        title: 'Scientific Rigour',
        description: 'We uphold the highest standards of research methodology and evidence generation.',
        icon: 'science',
    },
    {
        title: 'Impact-Driven',
        description: 'We translate research findings into real-world improvements in healthcare delivery.',
        icon: 'trending_up',
    },
    {
        title: 'Collaboration',
        description: 'We build strong partnerships with institutions, communities, and policymakers.',
        icon: 'groups',
    },
    {
        title: 'Integrity',
        description: 'We conduct all research with transparency, ethics, and accountability.',
        icon: 'verified',
    },
    {
        title: 'Innovation',
        description: 'We embrace creative approaches to solve complex healthcare challenges.',
        icon: 'lightbulb',
    },
    {
        title: 'Equity',
        description: 'We are committed to addressing disparities and ensuring inclusive research.',
        icon: 'balance',
    },
];

export const contact = {
    email: 'info@chqi.org',
    supportEmail: 'support@chqi.org',
    phone: '+254 700 000 000',
    address: 'University of Nairobi NATIL House, Nairobi, Kenya',
    website: 'https://www.chqi.org',
    mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15955.33611388832!2d36.7889744!3d-1.2617971!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x182f17a9af33c30f%3A0xc5f6dffb90e48f66!2sUniversity%20of%20Nairobi%20NATIL%20House!5e0!3m2!1sen!2sus!4v1711000000000!5m2!1sen!2sus',
    mapLink: 'https://www.google.com/maps/place/University+of+Nairobi+NATIL+House/@-1.2617273,36.7887998,55m/data=!3m1!1e3!4m14!1m7!3m6!1s0x182f17a9af33c30f:0xc5f6dffb90e48f66!2sUniversity+of+Nairobi+NATIL+House!8m2!3d-1.2617971!4d36.7889744!16s%2Fg%2F11tcjdd1wq!3m5!1s0x182f17a9af33c30f:0xc5f6dffb90e48f66!8m2!3d-1.2617971!4d36.7889744!16s%2Fg%2F11tcjdd1wq',
    social: {
        twitter: '',
        linkedin: '',
        facebook: '',
    },
};

export const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'About', href: '#about' },
    { label: 'Our Team', href: '#team' },
    { label: 'Research', href: '#research' },
    { label: 'Contact', href: '#contact' },
];

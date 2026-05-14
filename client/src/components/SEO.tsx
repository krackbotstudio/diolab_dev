import { Helmet } from 'react-helmet-async';

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbList {
  '@type': string;
  itemListElement: Array<{
    '@type': string;
    position: number;
    name: string;
    item?: string;
  }>;
}

interface OrganizationSchema {
  '@type': string;
  name: string;
  alternateName: string;
  url: string;
  logo: string | {
    '@type': string;
    url: string;
    width?: number;
    height?: number;
  };
  image?: string | {
    '@type': string;
    url: string;
    width?: number;
    height?: number;
  };
  sameAs?: string[];
  contactPoint: Array<{
    '@type': string;
    telephone: string;
    contactType: string;
    areaServed?: string;
    availableLanguage?: string | string[];
  }>;
  address: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  areaServed?: string;
  availableLanguage?: string | string[];
  foundingDate?: string;
  numberOfEmployees?: string;
  duns?: string;
  founder?: {
    '@type': string;
    name: string;
  };
  knowsAbout?: string[];
}

interface MedicalBusinessSchema {
  '@type': string;
  name: string;
  image: string | {
    '@type': string;
    url: string;
    width?: number;
    height?: number;
  };
  url: string;
  telephone: string;
  priceRange: string;
  geo: {
    '@type': string;
    latitude: number;
    longitude: number;
  };
  address: {
    '@type': string;
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
    addressCountry: string;
  };
  openingHoursSpecification: Array<{
    '@type': string;
    dayOfWeek: string[];
    opens: string;
    closes: string;
  }>;
  aggregateRating?: {
    '@type': string;
    ratingValue: number;
    reviewCount: number;
  };
  servesCuisine: string[];
}

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  twitterCard?: string;
  breadcrumbs?: BreadcrumbItem[];
  organizationSchema?: OrganizationSchema;
  medicalBusinessSchema?: MedicalBusinessSchema;
}

const SEO = ({
  title = 'Diolab - AI-Powered Software Platform for Healthcare Centers',
  description = 'AI-powered software platform for healthcare centers. Unify diagnostics, OP consultations, inpatient care, and pharmacy into one system. Built for Indian healthcare providers.',
  canonical,
  ogTitle,
  ogDescription,
  ogImage = '/diolab-og-image.jpg',
  ogUrl,
  ogType = 'website',
  twitterCard = 'summary_large_image',
  breadcrumbs,
  organizationSchema,
  medicalBusinessSchema
}: SEOProps) => {
  const currentUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '';
  const finalCanonical = canonical || currentUrl;
  const finalOgTitle = ogTitle || title;
  const finalOgDescription = ogDescription || description;
  const finalOgUrl = ogUrl || currentUrl;

  // Default organization schema
  const defaultOrganizationSchema: OrganizationSchema = {
    '@type': 'Organization',
    name: 'Diolab',
    alternateName: 'Diolab Diagnostic Solutions',
    url: 'https://www.diolab.in',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.diolab.in/diolab-og-image.jpg',
      width: 1200,
      height: 630
    },
    image: {
      '@type': 'ImageObject',
      url: 'https://www.diolab.in/diolab-og-image.jpg',
      width: 1200,
      height: 630
    },
    sameAs: [
      'https://www.facebook.com/diolab',
      'https://www.twitter.com/diolab',
      'https://www.linkedin.com/company/diolab',
      'https://www.instagram.com/diolab'
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: '+91-9160711252',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi']
      },
      {
        '@type': 'ContactPoint',
        telephone: '+91-8971690163',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi']
      }
    ],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '800 Jubilee, 2nd Floor, Road No. 36, Jubilee Hills',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500033',
      addressCountry: 'IN'
    },
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi'],
    foundingDate: '2023',
    numberOfEmployees: '10-50',
    duns: '',
    founder: {
      '@type': 'Person',
      name: 'Diolab Team'
    },
    knowsAbout: ['Diagnostic Laboratory', 'Healthcare Software', 'Medical Technology', 'Laboratory Information System'],
    ...(organizationSchema || {})
  };

  // Default medical business schema
  const defaultMedicalBusinessSchema: MedicalBusinessSchema = {
    '@type': 'MedicalBusiness',
    name: 'Diolab Diagnostic Center',
    image: {
      '@type': 'ImageObject',
      url: 'https://www.diolab.in/diolab-og-image.jpg',
      width: 1200,
      height: 630
    },
    url: 'https://www.diolab.in',
    telephone: '+91-9160711252',
    priceRange: '$$',
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 28.6139,
      longitude: 77.2090
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '800 Jubilee, 2nd Floor, Road No. 36, Jubilee Hills',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      postalCode: '500033',
      addressCountry: 'IN'
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        opens: '08:00',
        closes: '20:00'
      }
    ],
    servesCuisine: ['Diagnostic Services', 'Lab Tests', 'Health Checkups'],
    ...(medicalBusinessSchema || {})
  };

  // Create breadcrumb schema if breadcrumbs are provided
  const breadcrumbSchema: BreadcrumbList | null = breadcrumbs ? {
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  } : null;

  return (
    <Helmet>
      {/* Title and Description */}
      <title>{title}</title>
      <meta name="description" content={description} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonical} />
      
      {/* Open Graph Tags */}
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={finalOgUrl} />
      <meta property="og:type" content={ogType} />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:card" content={twitterCard} />
      
      {/* JSON-LD Schema Markup */}
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          ...defaultOrganizationSchema
        })}
      </script>
      
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Diolab',
          url: 'https://www.diolab.in',
          potentialAction: {
            '@type': 'SearchAction',
            target: 'https://www.diolab.in/search?q={search_term_string}',
            'query-input': 'required name=search_term_string'
          }
        })}
      </script>
      
      {breadcrumbSchema && (
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            ...breadcrumbSchema
          })}
        </script>
      )}
      
      <script type="application/ld+json">
        {JSON.stringify({
          '@context': 'https://schema.org',
          ...defaultMedicalBusinessSchema
        })}
      </script>
    </Helmet>
  );
};

export default SEO;
// worker.js

// Declare variables at the top
const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN'; // Replace with your Patreon Access Token
const CAMPAIGN_ID = 'YOUR_CAMPAIGN_ID';   // Replace with your Patreon Campaign ID
const ALLOWED_ORIGIN = 'YOUR_DOMAIN'; // Replace with your allowed CORS origin

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const origin = request.headers.get('Origin');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    // Handle CORS preflight request
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Check if the request Origin matches the allowed origin
  if (origin !== ALLOWED_ORIGIN) {
    return new Response('Forbidden', { status: 403 });
  }

  const url = new URL(request.url);
  let pathname = url.pathname.replace(/\/+/g, '/').replace(/\/+$/, '').trim();
  console.log(`handleRequest - Normalized pathname: '${pathname}'`);

  let response;

  if (pathname === '/patreon-poetry') {
    console.log('handleRequest - Path matched: /patreon-poetry');
    response = await getPatreonPoetry();
  } else if (pathname === '/test') {
    console.log('handleRequest - Path matched: /test');
    response = new Response('Worker is operational.', { status: 200 });
  } else if (pathname === '/') {
    console.log('handleRequest - Path matched: /');
    response = new Response('Worker root path accessed.', { status: 200 });
  } else {
    console.log(`handleRequest - Path '${pathname}' not matched. Returning Not Found.`);
    response = new Response('Not Found - Path does not match any endpoint', { status: 404 });
  }

  // Set CORS headers on the response
  response = setCORSHeaders(response);

  return response;
}

// Function to set CORS headers
function setCORSHeaders(response) {
  response.headers.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  response.headers.set('Vary', 'Origin');
  return response;
}

async function getPatreonPoetry() {
  try {
    console.log('getPatreonPoetry - Fetching posts from Patreon API...');
    const { posts, included } = await fetchAllPosts(ACCESS_TOKEN, CAMPAIGN_ID);
    console.log(`getPatreonPoetry - Fetched ${posts.length} posts.`);

    const structuredData = structurePostsData({ posts, included });
    console.log('getPatreonPoetry - Structured posts data.');

    const jsonResponse = JSON.stringify(structuredData);
    console.log('getPatreonPoetry - JSON response prepared.');

    return new Response(jsonResponse, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('getPatreonPoetry - Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function fetchAllPosts(accessToken, campaignId) {
  let posts = [];
  let included = [];
  let nextPage = null;
  let pageCount = 0;

  do {
    console.log(`fetchAllPosts - Fetching page ${pageCount + 1}. Next page cursor: ${nextPage}`);

    const url = new URL(`https://www.patreon.com/api/oauth2/v2/campaigns/${campaignId}/posts`);

    // Include all fields for post
    url.searchParams.append(
      'fields[post]',
      'app_id,app_status,content,embed_data,embed_url,is_paid,is_public,tiers,published_at,title,url'
    );

    // Include relationships
    url.searchParams.append('include', 'campaign,user');

    // Fields for included resources
    url.searchParams.append('fields[campaign]', 'creation_name,summary,patron_count');
    url.searchParams.append('fields[user]', 'full_name,vanity,url,image_url');

    if (nextPage) {
      url.searchParams.append('page[cursor]', nextPage);
    }

    console.log('fetchAllPosts - Fetch URL:', url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'YourAppName (your.email@example.com)', // Replace with your app name and contact email
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log(`fetchAllPosts - Successfully fetched page ${pageCount + 1}.`);
      posts = posts.concat(data.data);
      if (data.included) {
        included = included.concat(data.included);
      }
      nextPage = data.meta?.pagination?.cursors?.next || null;
      pageCount++;
    } else {
      console.error('fetchAllPosts - Patreon API Error:', data);
      throw new Error(
        `Failed to fetch posts from Patreon API: ${
          data.errors ? data.errors[0].detail : data.error || 'Unknown error'
        }`
      );
    }
  } while (nextPage);

  console.log('fetchAllPosts - All pages fetched.');
  return { posts, included };
}

function structurePostsData({ posts, included }) {
  console.log('structurePostsData - Structuring posts data...');

  const structuredPosts = [];

  posts.forEach((post) => {
    const postData = {
      id: post.id,
      title: post.attributes.title,
      content: post.attributes.content,
      published_at: post.attributes.published_at,
      is_public: post.attributes.is_public,
    };

    if (!postData.content) return; // Skip posts with no content

    // Remove HTML tags to get plain text
    const plainContent = stripHtml(postData.content);

    // Extract hashtags (case-insensitive)
    const hashtags = plainContent.match(/#\w+/gi);

    // Check if the post contains #poetry hashtag
    if (!hashtags || !hashtags.some((tag) => tag.toLowerCase() === '#poetry')) return; // Skip if not poetry

    // Extract category from second hashtag
    let category = 'Throwetry';
    if (hashtags.length >= 2) {
      category = hashtags[1].substring(1); // Remove '#' from hashtag
      category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase(); // Capitalize
    }

    // Remove hashtags from content (case-insensitive)
    const contentWithoutHashtags = postData.content.replace(/#\w+/gi, '').trim();

    // Clean up HTML content
    const cleanedContent = cleanHtmlContent(contentWithoutHashtags);

    // Add to structured posts
    structuredPosts.push({
      title: postData.title.trim(),
      category: category.trim(),
      content: cleanedContent,
    });
  });

  console.log(`structurePostsData - Total poems structured: ${structuredPosts.length}`);

  return structuredPosts;
}

// Helper function to strip HTML tags
function stripHtml(html) {
  // Replace script and style tags and their content
  html = html.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '');
  html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '');
  // Remove all remaining HTML tags
  return html.replace(/<[^>]+>/g, ' ');
}

// Helper function to clean up HTML content
function cleanHtmlContent(html) {
  // Replace malformed < br> or < br > with <br>
  html = html.replace(/<\s*br\s*>/gi, '<br>');
  // Remove extra spaces within tags
  html = html.replace(/<\s*(\/?\s*\w+)\s*>/g, '<$1>');
  // Remove any spaces before or after HTML tags
  html = html.replace(/>\s+/g, '>');
  html = html.replace(/\s+</g, '<');
  // Remove duplicate spaces
  html = html.replace(/\s{2,}/g, ' ');
  // Trim the content
  html = html.trim();
  return html;
}

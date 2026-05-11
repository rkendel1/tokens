/**
 * Robots.txt checker
 * Checks if a URL is allowed by robots.txt
 */

export async function checkRobotsTxt(url) {
  try {
    const urlObj = new URL(url);
    const robotsUrl = `${urlObj.protocol}//${urlObj.hostname}/robots.txt`;
    
    const response = await fetch(robotsUrl);
    if (!response.ok) {
      return { status: 'ok', allowed: true };
    }
    
    const robotsTxt = await response.text();
    const lines = robotsTxt.split('\n');
    
    let userAgentMatch = false;
    let disallowRules = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('User-agent:')) {
        const agent = trimmed.substring(11).trim();
        userAgentMatch = agent === '*' || agent.toLowerCase() === 'dembrandt';
      } else if (userAgentMatch && trimmed.startsWith('Disallow:')) {
        const path = trimmed.substring(9).trim();
        if (path) {
          disallowRules.push(path);
        }
      }
    }
    
    // Check if the URL path is disallowed
    const path = urlObj.pathname;
    for (const rule of disallowRules) {
      if (rule === '/' || path.startsWith(rule)) {
        return { status: 'ok', allowed: false, rule };
      }
    }
    
    return { status: 'ok', allowed: true };
  } catch (error) {
    // If we can't fetch robots.txt, assume it's allowed
    return { status: 'ok', allowed: true };
  }
}

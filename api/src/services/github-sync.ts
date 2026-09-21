import { Env } from '../config';

export interface GitHubSyncResult {
  success: boolean;
  path: string;
  commitSha?: string;
  error?: string;
}

/**
 * 100% Cloud-Native Obsidian Vault Sync via GitHub REST API.
 * Runs inside Cloudflare Workers 24/7/365 even if your laptop is shut for months.
 */
export async function syncFileToGitHub(
  env: Env,
  filePath: string,
  content: string,
  commitMessage?: string
): Promise<GitHubSyncResult> {
  const token = env.GITHUB_TOKEN;
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO || 'second-brain-vault';
  const branch = env.GITHUB_BRANCH || 'main';

  if (!token || !owner) {
    // Graceful no-op if GitHub secrets not yet configured
    console.log(`ℹ️ [Cloud Sync] GITHUB_TOKEN or GITHUB_OWNER not configured. Skipping remote git commit for ${filePath}.`);
    return { success: false, path: filePath, error: 'GitHub credentials not configured in Cloudflare secrets' };
  }

  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;
  const message = commitMessage || `vault: update ${cleanPath} [via Cloudflare Worker]`;

  try {
    // 1. Check if file already exists in repo to obtain its blob SHA (required for updates)
    let existingSha: string | undefined;
    const checkRes = await fetch(`${url}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Cloudflare-Worker-Second-Brain-Sync',
      },
    });

    if (checkRes.ok) {
      const checkData: any = await checkRes.json();
      existingSha = checkData.sha;
    }

    // 2. Base64 encode the markdown content
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    let binary = '';
    for (let i = 0; i < data.byteLength; i++) {
      binary += String.fromCharCode(data[i]);
    }
    const base64Content = btoa(binary);

    // 3. Commit and push directly to GitHub in the cloud
    const putBody: any = {
      message,
      content: base64Content,
      branch,
    };
    if (existingSha) {
      putBody.sha = existingSha;
    }

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Cloudflare-Worker-Second-Brain-Sync',
      },
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error(`❌ [Cloud Sync] GitHub commit failed for ${cleanPath}:`, errText);
      return { success: false, path: cleanPath, error: errText };
    }

    const putData: any = await putRes.json();
    console.log(`✅ [Cloud Sync] Committed directly to GitHub: ${cleanPath} (Commit: ${putData.commit?.sha?.slice(0, 7)})`);
    return { success: true, path: cleanPath, commitSha: putData.commit?.sha };
  } catch (err: any) {
    console.error(`❌ [Cloud Sync] Unexpected error syncing ${cleanPath}:`, err);
    return { success: false, path: cleanPath, error: err.message };
  }
}

/**
 * Syncs multiple files sequentially to GitHub
 */
export async function syncBatchToGitHub(
  env: Env,
  files: { path: string; content: string }[],
  summaryMessage?: string
): Promise<{ total: number; successful: number }> {
  let successful = 0;
  for (const f of files) {
    const res = await syncFileToGitHub(env, f.path, f.content, summaryMessage);
    if (res.success) successful++;
  }
  return { total: files.length, successful };
}

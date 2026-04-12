import https from 'https';
import { URL } from 'url';
import { TeraBoxExtractor } from './src/services/TeraBoxExtractor';
import * as fs from 'fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

class DebugExtractor extends TeraBoxExtractor {
  async testDownloadEndpoint(shareUrl: string) {
    // Use the working httpGet with cookie accumulation
    const normalizedUrl = (this as any).normalizeUrl(shareUrl);
    console.log('Normalized:', normalizedUrl);
    
    const { body: html, cookies, finalUrl } = await (this as any).httpGet(normalizedUrl);
    console.log('cookies:', cookies.substring(0, 120));
    console.log('cookies length:', cookies.length);
    
    const jsToken = (this as any).extractJsToken(html);
    const { fullSurl, strippedSurl } = (this as any).extractSurl(shareUrl, finalUrl);
    console.log('jsToken:', jsToken ? 'YES' : 'NO', 'surl:', strippedSurl, 'fullSurl:', fullSurl);

    // Get share/list (works)
    let listUrl = `https://www.terabox.com/share/list?app_id=250528&shorturl=${strippedSurl}&root=1&dir=%2F&page=1&num=20&order=time&by=desc`;
    if (jsToken) listUrl += `&jsToken=${encodeURIComponent(jsToken)}`;
    const { body: listB } = await (this as any).httpGet(listUrl, {
      'Cookie': cookies, 'Referer': finalUrl, 'Accept': 'application/json'
    });
    const listData = JSON.parse(listB);
    console.log('\nshare/list errno:', listData.errno, 'files:', listData.list?.length);
    
    const file = listData.list?.[0];
    if (!file) { console.log('NO FILE'); return; }
    console.log('fs_id:', file.fs_id, 'name:', file.server_filename);
    
    // Get shorturlinfo for sign/timestamp/shareid/uk/randsk
    const infoUrl = `https://www.terabox.com/api/shorturlinfo?app_id=250528&shorturl=${fullSurl}&jsToken=${encodeURIComponent(jsToken || '')}&root=1`;
    const { body: infoB } = await (this as any).httpGet(infoUrl, {
      'Cookie': cookies, 'Referer': finalUrl, 'Accept': 'application/json'
    });
    const info = JSON.parse(infoB);
    console.log('\nshorturlinfo errno:', info.errno);
    console.log('shareid:', info.shareid, 'uk:', info.uk, 'sign:', info.sign);
    console.log('timestamp:', info.timestamp, 'randsk:', info.randsk);

    // Try /share/download
    const sekey = info.randsk ? decodeURIComponent(info.randsk) : '';
    const dlUrl = `https://www.terabox.com/share/download?app_id=250528&shareid=${info.shareid}&uk=${info.uk}&sign=${info.sign}&timestamp=${info.timestamp}&fid_list=[${file.fs_id}]&extra=${encodeURIComponent(JSON.stringify({sekey}))}`;
    
    console.log('\n=== Trying /share/download ===');
    
    // Use httpGet which follows redirects - the dlink might BE the redirect
    try {
      const { body: dlB, cookies: dlC, finalUrl: dlFinal } = await (this as any).httpGet(dlUrl, {
        'Cookie': cookies, 'Referer': finalUrl, 'Accept': 'application/json'
      });
      
      console.log('Final URL:', dlFinal?.substring(0, 150));
      
      // Check if we got redirected to a download URL (d-*.terabox.com)
      if (dlFinal && dlFinal.includes('terabox.com/file/')) {
        console.log('\n✅ Redirected to dlink:', dlFinal.substring(0, 150));
        fs.writeFileSync('tb_dlink.txt', dlFinal);
        return;
      }
      
      // Check if body is JSON with dlink
      try {
        const dlData = JSON.parse(dlB);
        fs.writeFileSync('tb_dl_response.json', JSON.stringify(dlData, null, 2));
        console.log('JSON errno:', dlData.errno);
        if (dlData.dlink) {
          console.log('\n✅ DLINK:', dlData.dlink.substring(0, 150));
          fs.writeFileSync('tb_dlink.txt', dlData.dlink);
        } else if (dlData.list?.[0]?.dlink) {
          console.log('\n✅ DLINK from list:', dlData.list[0].dlink.substring(0, 150));
          fs.writeFileSync('tb_dlink.txt', dlData.list[0].dlink);
        } else {
          console.log('❌ No dlink. Full response:');
          console.log(dlB.substring(0, 600));
        }
      } catch {
        console.log('Non-JSON response (first 500):');
        console.log(dlB.substring(0, 500));
        // Maybe it's the actual file content?
        fs.writeFileSync('tb_dl_raw.bin', dlB.substring(0, 1000));
      }
    } catch (e: any) {
      console.log('Error:', e.message);
    }
  }
}

const dbg = new DebugExtractor();
dbg.testDownloadEndpoint('https://terabox.com/s/1OB7ngRLALsH8y2e_TmWfWQ');





<!-- ====== script.js ====== -->
/***************************
 * File: script.js
 * Paste this into script.js
 ***************************/

/* ===== CONFIG ===== */
// Ganti YOUR_OPENROUTER_KEY dengan key Anda saat deployment. Jangan commit key ke repo publik.
const OPENROUTER_API_KEY = "YOUR_OPENROUTER_KEY";
// Jika situs Anda membutuhkan referer header, set di server-side atau replace di fetch headers.
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/* ===== UI REFERENCES ===== */
const modelSelect = document.getElementById('modelSelect');
const chatArea = document.getElementById('chatArea');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const btnClear = document.getElementById('btnClear');
const btnAddModel = document.getElementById('btnAddModel');
const downloadBtn = document.getElementById('downloadBtn');

/* ===== Helpers ===== */
function addMessage(text, who = 'ai'){
  const wrap = document.createElement('div');
  wrap.className = `msg ${who}`;
  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.textContent = text;
  wrap.appendChild(bubble);
  chatArea.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function setLoading(yes){
  if(yes){
    const el = document.createElement('div');
    el.className = 'loader';
    el.id = '__typing';
    el.textContent = 'AI mengetik...';
    chatArea.appendChild(el);
    chatArea.scrollTop = chatArea.scrollHeight;
  }else{
    const el = document.getElementById('__typing');
    if(el) el.remove();
  }
}

/* ===== Core: callModel (browser fetch + streaming parser) ===== */
async function callModel(modelName, userPrompt){
  // Create user message bubble immediately
  addMessage(userPrompt, 'user');
  setLoading(true);

  const body = {
    model: modelName,
    messages: [
      { role: 'user', content: userPrompt }
    ],
    // For streaming, set stream:true if supported by endpoint
    stream: true
  };

  try{
    const resp = await fetch(OPENROUTER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if(!resp.ok){
      const text = await resp.text();
      setLoading(false);
      addMessage(`Error: ${resp.status} - ${text}`, 'ai');
      return;
    }

    // If streaming is provided as SSE-like lines, read chunk by chunk
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let partial = '';
    let aiText = '';

    // Create an AI bubble that we will update
    const aiWrap = document.createElement('div');
    aiWrap.className = 'msg ai';
    const aiBubble = document.createElement('div');
    aiBubble.className = 'bubble';
    aiBubble.textContent = '';
    aiWrap.appendChild(aiBubble);
    chatArea.appendChild(aiWrap);
    chatArea.scrollTop = chatArea.scrollHeight;

    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      const chunk = decoder.decode(value, {stream:true});
      partial += chunk;

      // Many streaming endpoints send data in "data: {...}\n\n" chunks (SSE style)
      // We split by double newlines to extract full events
      let parts = partial.split(/\n\n/);
      // keep the last (possibly incomplete) part in partial
      partial = parts.pop();

      for(const part of parts){
        // remove leading "data: " if present
        const line = part.replace(/^data:\s*/,'').trim();
        if(!line) continue;
        // Some streams emit [DONE] or other markers
        if(line === '[DONE]'){
          // finished
          break;
        }
        try{
          const data = JSON.parse(line);
          // This structure may vary by provider. We attempt a few options.
          const delta = data.choices?.[0]?.delta?.content;
          const text = delta ?? data.choices?.[0]?.message?.content ?? data.output ?? data.text ?? null;
          if(text){
            aiText += text;
            aiBubble.textContent = aiText;
            chatArea.scrollTop = chatArea.scrollHeight;
          }
          // usage info may be present in final chunk
          if(data.usage){
            console.info('usage:', data.usage);
          }
        }catch(e){
          // not JSON, ignore or append raw
          aiText += line;
          aiBubble.textContent = aiText;
        }
      }
    }

    // If any leftover partial which is plain JSON or text, try to parse
    if(partial){
      const leftover = partial.replace(/^data:\s*/,'').trim();
      try{const data = JSON.parse(leftover); const finalText = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.delta?.content ?? data.text; if(finalText) aiText += finalText;}catch(e){ aiText += leftover; }
      aiBubble.textContent = aiText;
    }

    setLoading(false);
  }catch(err){
    setLoading(false);
    addMessage('Request failed: ' + String(err), 'ai');
  }
}

/* ===== UI wiring ===== */
sendBtn.addEventListener('click', ()=>{
  const prompt = promptInput.value.trim();
  if(!prompt) return;
  const model = modelSelect.value;
  promptInput.value = '';
  callModel(model, prompt);
});

promptInput.addEventListener('keydown', (e)=>{
  if(e.key === 'Enter') sendBtn.click();
});

btnClear.addEventListener('click', ()=>{
  chatArea.innerHTML = '';
});

btnAddModel.addEventListener('click', ()=>{
  const name = prompt('Masukkan model identifier (contoh: owner/model-name:tag)');
  if(name){
    addModel(name);
  }
});

function addModel(modelIdentifier){
  const opt = document.createElement('option');
  opt.value = modelIdentifier;
  opt.textContent = modelIdentifier;
  modelSelect.appendChild(opt);
  modelSelect.value = modelIdentifier;
}

// download both files as zip-like single download (two separate files using data URLs)
downloadBtn.addEventListener('click', ()=>{
  const html = `<!doctype html>\n${document.documentElement.outerHTML}`;
  // Build a blob for index.html and script.js
  const script = `/* script.js - generated from template */\n\n${document.querySelector('script[src="script.js"]') ? '' : ''}`;
  // Instead of zipping, create separate links for user to click
  const blobHtml = new Blob([html], {type:'text/html'});
  const blobScript = new Blob([getScriptText()], {type:'text/javascript'});
  const a1 = document.createElement('a');
  a1.href = URL.createObjectURL(blobHtml);
  a1.download = 'index.html';
  a1.click();
  setTimeout(()=>URL.revokeObjectURL(a1.href), 1000);
  const a2 = document.createElement('a');
  a2.href = URL.createObjectURL(blobScript);
  a2.download = 'script.js';
  a2.click();
  setTimeout(()=>URL.revokeObjectURL(a2.href), 1000);
});

function getScriptText(){
  // The easiest way for the download button is to embed the script content here.
  // For clarity we keep a short message instructing the user to copy the script.js contents from the template file.
  return `// Paste the script.js contents from the template provided by ChatGPT into this file.\n// Make sure to set OPENROUTER_API_KEY at the top of script.js before using.\n`;
}

/* ===== Optional: add some default custom models for convenience ===== */
addModel('openai/gpt-4o-mini');

/* ===== End of script.js ===== */

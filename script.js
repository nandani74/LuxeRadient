// script.js — LuxeRadiant (Google Sheets backend + simple manual UPI flow)
// CONFIG: your deployed Google Apps Script Web App URL (paste from your deployment)
const SHEETS_WEB_APP = 'https://script.google.com/macros/s/AKfycbwUPwxJgknNHJTTsudn4bZxw4AMuWjiwTQOM9vGXoCHqQ0kUzaDC8Pl8dPzXfqQm7or/exec';

// Your UPI details (from user)
const UPI_ID = '7499912716@ybl';
const UPI_PAYEE_NAME = 'LuxeRadiant';
const OWNER_EMAIL = 'nandaniraut21@gmail.com';

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- small helpers ---------- */
  const toast = document.getElementById('toast');
  function showToast(msg, ms = 2200) {
    toast.textContent = msg;
    toast.style.display = 'block';
    toast.setAttribute('aria-hidden', 'false');
    setTimeout(()=>{ toast.style.display = 'none'; toast.setAttribute('aria-hidden','true'); }, ms);
  }

  /* ---------- reveal observer ---------- */
  const reveals = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); } });
  }, {threshold:0.12});
  reveals.forEach(r => io.observe(r));

  /* ---------- Modal / Quickview ---------- */
  const modal = document.getElementById('modal');
  const modalImg = document.getElementById('modalImg'), modalTitle = document.getElementById('modalTitle'), modalPrice = document.getElementById('modalPrice'), modalDesc = document.getElementById('modalDesc');
  const modalClose = document.querySelector('.modal-close'), modalCancel = document.getElementById('modalCancel');

  function openModal(data){
    modalImg.src = data.img || '';
    modalTitle.textContent = data.name || 'Product';
    modalPrice.textContent = data.price || '';
    modalDesc.textContent = data.desc || '';
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(){
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    const ofb = document.getElementById('orderFeedback'); if (ofb) ofb.textContent = '';
  }

  document.querySelectorAll('.quickview').forEach(b => b.addEventListener('click', e => {
    const card = e.target.closest('.product-card');
    openModal({ name: card.dataset.name, price: card.dataset.price, img: card.dataset.img, desc: card.dataset.desc });
  }));

  document.querySelectorAll('.order').forEach(b => b.addEventListener('click', e => {
    const card = e.target.closest('.product-card');
    openModal({ name: card.dataset.name, price: card.dataset.price, img: card.dataset.img, desc: card.dataset.desc });
    // prefill order
    document.getElementById('orderName').value = '';
    document.getElementById('orderEmail').value = '';
    document.getElementById('orderQty').value = 1;
    document.getElementById('orderMsg').value = `${card.dataset.name} — Qty:1`;
  }));

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if (e.target===modal) closeModal(); });

  // Open empty order modal from top button
  const orderNowTop = document.getElementById('orderNowTop');
  if (orderNowTop) orderNowTop.addEventListener('click', ()=> openModal({name:'Order Request', price:'', img:''}));

  /* ---------- postToSheet: send JSON to Apps Script ---------- */
  async function postToSheet(payload){
    if (!SHEETS_WEB_APP || SHEETS_WEB_APP.includes('PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE')) {
      console.warn('SHEETS_WEB_APP not set in script.js');
      return { ok:false, msg:'no_endpoint' };
    }
    try {
      const res = await fetch(SHEETS_WEB_APP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      return data || { ok:true };
    } catch (err) {
      console.error('postToSheet error', err);
      return { ok:false, msg:'network_error' };
    }
  }

  /* ---------- Order submit (SIMPLE flow) ---------- */
  const orderForm = document.getElementById('orderForm');
  if (orderForm) orderForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = document.getElementById('orderName').value.trim();
    const email = document.getElementById('orderEmail').value.trim();
    const qty = document.getElementById('orderQty').value;
    const msg = document.getElementById('orderMsg').value.trim();
    const product = document.getElementById('modalTitle').textContent;
    const price = document.getElementById('modalPrice').textContent || '';

    if (!name || !email) {
      document.getElementById('orderFeedback').textContent = 'Please fill name & email';
      return;
    }

    const payload = {
      type: 'order',
      product,
      price,
      name,
      email,
      quantity: qty,
      message: msg,
      upi_paid: 'no',
      payment_ref: ''
    };

    // Send to Google Sheets (Apps Script will email OWNER_EMAIL using MailApp)
    const res = await postToSheet(payload);
    if (res && res.ok) {
      showToast('Order received — saved to sheet');
      document.getElementById('orderFeedback').textContent = 'Order received. Please pay using UPI below.';
      // show UPI QR/modal so the customer can pay
      showUPIFlowForOrder(res.id || ('LR' + Date.now()), payload);
      setTimeout(()=> closeModal(), 1400);
    } else {
      showToast('Unable to reach backend — order saved locally');
      document.getElementById('orderFeedback').textContent = 'Unable to reach backend — try again later.';
      // fallback: save in localStorage for demo
      const key = 'luxeradiant_orders';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.unshift(Object.assign({id:'LOCAL'+Date.now(), date: new Date().toISOString()}, payload));
      localStorage.setItem(key, JSON.stringify(arr));
    }
  });

  /* ---------- Contact form submit ---------- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) contactForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();
    if (!name || !email) {
      document.getElementById('contactFeedback').textContent = 'Please enter name & email.';
      return;
    }

    const payload = { type:'contact', product:'', price:'', name, email, quantity:'', message, upi_paid:'', payment_ref:'' };
    const res = await postToSheet(payload);
    if (res && res.ok) {
      showToast('Message sent — saved to sheet');
      document.getElementById('contactFeedback').textContent = 'Thanks — we will contact you via email.';
      contactForm.reset();
    } else {
      showToast('Saved locally (no endpoint)');
      document.getElementById('contactFeedback').textContent = 'Saved locally (endpoint not configured).';
      // local fallback
      const key = 'luxeradiant_contacts';
      const arr = JSON.parse(localStorage.getItem(key) || '[]');
      arr.unshift(Object.assign({id:'LOCAL'+Date.now(), date: new Date().toISOString()}, payload));
      localStorage.setItem(key, JSON.stringify(arr));
    }
  });

  // reset button
  const contactReset = document.getElementById('contactReset');
  if (contactReset) contactReset.addEventListener('click', ()=> { contactForm.reset(); document.getElementById('contactFeedback').textContent=''; });

  /* ---------- UPI Payment flow (simple manual) ---------- */
  function buildUpiLink({pa, pn, am=''}) {
    const parts = [`pa=${encodeURIComponent(pa)}`, `pn=${encodeURIComponent(pn)}`, `cu=INR`];
    if (am) parts.push(`am=${encodeURIComponent(am)}`);
    return `upi://pay?${parts.join('&')}`;
  }

  function showUPIFlowForOrder(orderId, orderPayload) {
    // create floating UPI modal
    let upiModal = document.getElementById('upiModal');
    if (upiModal) upiModal.remove(); // recreate
    upiModal = document.createElement('div');
    upiModal.id = 'upiModal';
    Object.assign(upiModal.style, {
      position:'fixed', right:'20px', bottom:'80px', background:'#0d0d0d', color:'#fff', padding:'14px', borderRadius:'12px',
      boxShadow:'0 24px 60px rgba(0,0,0,0.6)', zIndex:'900', width:'320px', fontFamily: 'Poppins, sans-serif'
    });

    const amount = (orderPayload.price || '').replace(/[^\d.]/g,'') || '';
    const upiLink = buildUpiLink({ pa: UPI_ID, pn: UPI_PAYEE_NAME, am: amount });

    const qrUrl = `https://chart.googleapis.com/chart?chs=300x300&cht=qr&chl=${encodeURIComponent(upiLink)}`;

    upiModal.innerHTML = `
      <div style="display:flex; gap:12px; align-items:center;">
        <img src="${qrUrl}" alt="UPI QR" style="width:104px;height:104px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);object-fit:cover">
        <div style="flex:1">
          <div style="font-weight:700">Pay via UPI</div>
          <div style="color:var(--muted); margin-top:6px; font-size:13px">UPI ID: <code style="background:#000;padding:4px 6px;border-radius:6px;color:#fff">${UPI_ID}</code></div>
          <div style="margin-top:10px; display:flex; gap:8px;">
            <a id="upiOpenBtn" class="btn primary" style="padding:8px 10px;font-size:13px">Open UPI app</a>
            <button id="upiDoneBtn" class="btn ghost" style="padding:8px 10px;font-size:13px">I paid</button>
          </div>
          <div style="font-size:12px;color:#cfc7c3;margin-top:8px">After paying, click "I paid" and add the txn id or screenshot note.</div>
        </div>
      </div>
      <div style="text-align:right;margin-top:8px"><button id="upiClose" class="btn ghost" style="padding:6px 8px">Close</button></div>
    `;

    document.body.appendChild(upiModal);

    document.getElementById('upiOpenBtn').addEventListener('click', ()=> { window.location.href = upiLink; });
    document.getElementById('upiClose').addEventListener('click', ()=> { upiModal.remove(); showToast('UPI dialog closed'); });

    document.getElementById('upiDoneBtn').addEventListener('click', async ()=> {
      const ref = prompt('Enter payment reference / UPI txn id (optional). If you paid via Google Pay / PhonePe, paste the UPI txn id here.');
      const confirmPayload = {
        type: 'order',
        product: orderPayload.product,
        price: orderPayload.price,
        name: orderPayload.name,
        email: orderPayload.email,
        quantity: orderPayload.quantity,
        message: (orderPayload.message || '') + ' // Payment confirmed by customer.',
        upi_paid: 'yes',
        payment_ref: ref || ''
      };
      const r = await postToSheet(confirmPayload);
      if (r && r.ok) {
        showToast('Payment info saved. We will verify and confirm order.');
        upiModal.remove();
      } else {
        showToast('Failed to update payment (no endpoint)');
      }
    });

    showToast('UPI dialog ready — scan QR or open UPI app.');
  }

  /* ---------- Admin helper: download CSV of sheet data ---------- */
  window.LuxeAdmin = {
    async downloadCSV(){
      if (!SHEETS_WEB_APP || SHEETS_WEB_APP.includes('PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE')) { return alert('Set the SHEETS_WEB_APP URL in script.js'); }
      try {
        const res = await fetch(SHEETS_WEB_APP);
        const arr = await res.json();
        if (!arr || !arr.length) { alert('No orders'); return; }
        const header = Object.keys(arr[0]).join(',') + '\n';
        const rows = arr.map(o => Object.values(o).map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
        const csv = header + rows;
        const blob = new Blob([csv], {type:'text/csv'}), url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'orders.csv'; a.click(); URL.revokeObjectURL(url);
      } catch (err) { alert('Failed to fetch orders - check SHEETS_WEB_APP'); }
    },
    clearOrdersLocal: ()=>{ if (confirm('Clear local orders?')) localStorage.removeItem('luxeradiant_orders'); }
  };

  /* ---------- Small interactions: cart, carousel, reviews ---------- */
  // cart counter
  let cartCount = 0; const cartCountEl = document.getElementById('cartCount');
  document.querySelectorAll('.btn.small.primary.order').forEach(b => {
    b.addEventListener('click', ()=> { cartCount++; if (cartCountEl) cartCountEl.textContent = cartCount; showToast('Added to cart'); });
  });

  // carousel
  const carousel = document.getElementById('newCarousel');
  if (carousel){
    const track = carousel.querySelector('.carousel-track'); const slides = Array.from(track.children);
    let index = 0;
    function moveTo(i){ track.style.transform = `translateX(-${i * (slides[0].getBoundingClientRect().width + 12)}px)`; index = i; }
    carousel.querySelector('.carousel-btn.prev').addEventListener('click', ()=> moveTo(Math.max(0, index-1)));
    carousel.querySelector('.carousel-btn.next').addEventListener('click', ()=> moveTo(Math.min(slides.length-1, index+1)));
    setInterval(()=> moveTo((index+1) % slides.length), 3600);
  }

  // reviews autoplay
  const reviews = document.querySelectorAll('#reviews .review');
  if (reviews.length){ let rIdx = 0; function showReview(i){ reviews.forEach((r, idx)=> r.style.display = (idx===i? 'block':'none')); } showReview(0); setInterval(()=>{ rIdx=(rIdx+1)%reviews.length; showReview(rIdx); }, 4200); }

  // close modal on ESC
  document.addEventListener('keydown', (e)=> { if (e.key==='Escape') closeModal(); });

  // reveal initial viewport
  document.querySelectorAll('.reveal').forEach(el => { if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in'); });

});

/* script.js - frontend logic (no build steps) */
const SHOPS = [
  { id: 's1', name: 'SpiceCorner', desc: 'Indian • Fast delivery', menu: [
    { id: 'm1', name: 'Butter Chicken', price: 220 },
    { id: 'm2', name: 'Paneer Tikka', price: 180 },
  ]},
  { id: 's2', name: 'WrapWave', desc: 'Wraps & Rolls', menu: [
    { id: 'm3', name: 'Chicken Kathi Roll', price: 110 },
    { id: 'm4', name: 'Falafel Wrap', price: 90 },
  ]},
  { id: 's3', name: 'GreenBowl', desc: 'Healthy Salads', menu: [
    { id: 'm5', name: 'Quinoa Salad', price: 160 },
    { id: 'm6', name: 'Caesar Salad', price: 140 },
  ]},
];

// change this to your real owner phone in international format (no + sign here for wa.me link)
const OWNER_WHATSAPP = '919800000000';    // Example: 91 country code + number (replace)
const OWNER_SMS_NUMBER = '+919800000000'; // Example with +, for sms: link
const AUTO_SMS_ENDPOINT = '/api/order';   // frontend posts here for automatic server-side SMS

let cart = [];

function $(sel){ return document.querySelector(sel) }
function renderShops(){
  const container = $('#shops');
  container.innerHTML = '';
  SHOPS.forEach(s=>{
    const div = document.createElement('div');
    div.className = 'shop-card';
    div.innerHTML = `
      <div class="shop-info">
        <div class="shop-name">${s.name}</div>
        <div class="shop-desc">${s.desc}</div>
      </div>
      <div>
        <button class="btn btn-menu" data-shop="${s.id}">Menu</button>
      </div>
    `;
    container.appendChild(div);
  });
}
function openMenu(shopId){
  const shop = SHOPS.find(s=>s.id===shopId);
  if(!shop) return;
  // simple menu modal using window.prompt for compactness
  const choice = prompt(`Menu for ${shop.name}:\n` + shop.menu.map((m,i)=>`${i+1}. ${m.name} — ₹${m.price}`).join('\n') + `\nEnter item number to add to cart`);
  const idx = parseInt(choice) - 1;
  if(!isNaN(idx) && shop.menu[idx]){
    addToCart({...shop.menu[idx], shop: shop.name});
  }
}
function addToCart(item){
  cart.push(item);
  renderCart();
}
function renderCart(){
  const cartItems = $('#cartItems');
  cartItems.innerHTML = '';
  if(cart.length === 0){
    $('#cartEmpty').style.display = 'block';
  } else {
    $('#cartEmpty').style.display = 'none';
  }
  cart.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.className = 'cart-item';
    li.innerHTML = `<div>${it.name} <small style="color:#999">(${it.shop})</small></div><div>₹${it.price} <button data-idx="${idx}" class="btn" style="background:transparent;color:#ff6f3c">Remove</button></div>`;
    cartItems.appendChild(li);
  });
}
function removeFromCart(i){
  cart.splice(i,1);
  renderCart();
}

document.addEventListener('click', e=>{
  if(e.target.matches('.btn-menu')) openMenu(e.target.dataset.shop);
  if(e.target.matches('.cart-item button')) removeFromCart(e.target.dataset.idx);
});

document.getElementById('orderForm').addEventListener('submit', async function(ev){
  ev.preventDefault();
  const name = $('#custName').value.trim();
  const mobile = $('#custMobile').value.trim();
  const address = $('#custAddress').value.trim();
  const notifyMethod = $('#notifyMethod').value;

  if(!name || !mobile || !address) return alert('Please fill all fields.');
  if(cart.length === 0) return alert('Cart is empty.');

  const order = {
    id: 'ORD' + Date.now(),
    name, mobile, address, cart,
    total: cart.reduce((s,i)=>s+i.price,0),
    placedAt: new Date().toISOString()
  };

  // build message
  const msgLines = [
    `New order: ${order.id}`,
    `Name: ${order.name}`,
    `Mobile: ${order.mobile}`,
    `Address: ${order.address}`,
    `Items:`,
    ...order.cart.map(ci => `- ${ci.name} (${ci.shop}) - ₹${ci.price}`),
    `Total: ₹${order.total}`,
    `Payment: COD`
  ];
  const msg = msgLines.join('\n');

  if(notifyMethod === 'free-wa'){
    // open WhatsApp chat to owner with prefilled message
    const waUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');
    $('#orderResult').textContent = 'WhatsApp draft opened — customer must send the message.';
    // Show friendly order success screen
    showCustomerConfirmation(order);
    return;
  }

  if(notifyMethod === 'free-sms'){
    // Use sms: link to open SMS app on mobile devices with body prefilled
    // Note: `sms:` behavior varies by platform. Many desktop browsers will not open an SMS app.
    const smsUrl = `sms:${OWNER_SMS_NUMBER}?body=${encodeURIComponent(msg)}`;
    window.open(smsUrl, '_blank');
    $('#orderResult').textContent = 'SMS draft opened — customer must send the message.';
    showCustomerConfirmation(order);
    return;
  }

  if(notifyMethod === 'auto-sms'){
    // Post to backend endpoint to trigger automatic SMS.
    // The server must implement POST /api/order to accept JSON and send SMS.
    try{
      const resp = await fetch(AUTO_SMS_ENDPOINT, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ order, message: msg })
      });
      const j = await resp.json();
      if(resp.ok){
        $('#orderResult').textContent = 'Order placed — owner notified automatically.';
      } else {
        $('#orderResult').textContent = 'Order placed but automatic notify failed: ' + (j.error || resp.statusText);
      }
    } catch(err){
      console.error(err);
      $('#orderResult').textContent = 'Order placed but could not reach server for automatic notify.';
    }
    showCustomerConfirmation(order);
    return;
  }
});

function showCustomerConfirmation(order){
  const box = document.createElement('div');
  box.innerHTML = `<h4>Thanks! Your order ${order.id} was placed.</h4>
  <p>Amount due on delivery: <strong>₹${order.total}</strong></p>
  <p>We will contact you on ${order.mobile} if needed.</p>`;
  // clear cart & inputs
  cart = [];
  renderCart();
  $('#custName').value = '';
  $('#custMobile').value = '';
  $('#custAddress').value = '';
  $('#orderResult').appendChild(box);
}


// initial render
renderShops();

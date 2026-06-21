const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuButton = document.getElementById('menuButton');
const themeToggle = document.getElementById('themeToggle');
const citySearch = document.getElementById('citySearch');
const clockTime = document.getElementById('clockTime');
const clockDate = document.getElementById('clockDate');
const healthScore = document.getElementById('healthScore');
const healthRing = document.getElementById('healthRing');
const feedList = document.getElementById('feedList');
const resolveAll = document.getElementById('resolveAll');
const addTicket = document.getElementById('addTicket');
const ticketList = document.getElementById('ticketList');
const lastUpdated = document.getElementById('lastUpdated');
const navLinks = document.querySelectorAll('.nav-link');
const moduleCards = document.querySelectorAll('[data-module]');
const districtMarkers = document.querySelectorAll('.district-marker');
const districtReadout = document.getElementById('districtReadout');

const districts = {
  Shinjuku: { transit: 92, energy: 78, safety: 'Normal', aqi: 45 },
  Shibuya: { transit: 86, energy: 73, safety: 'Busy', aqi: 51 },
  Koto: { transit: 89, energy: 81, safety: 'Normal', aqi: 38 },
  Chiyoda: { transit: 96, energy: 69, safety: 'Normal', aqi: 43 },
  Taito: { transit: 82, energy: 71, safety: 'Event Load', aqi: 58 }
};

let alerts = [
  { icon: 'fa-train', type: 'warning', title: 'Rail delay detected', detail: 'Yamanote inner loop running 6 minutes behind.', time: '4 min ago', risk: 'medium' },
  { icon: 'fa-bolt', type: 'info', title: 'Demand response active', detail: 'Grid load trimmed by 4.2% in commercial zones.', time: '9 min ago', risk: 'low' },
  { icon: 'fa-leaf', type: 'success', title: 'Air quality improving', detail: 'PM2.5 dropped across east-side sensors.', time: '13 min ago', risk: 'low' },
  { icon: 'fa-shield', type: 'danger', title: 'Crowd density spike', detail: 'Shibuya crossing crowding above normal threshold.', time: '18 min ago', risk: 'high' },
  { icon: 'fa-tint', type: 'info', title: 'Water network stable', detail: 'No pressure drops detected in the last cycle.', time: '22 min ago', risk: 'low' }
];

const ticketTemplates = [
  { priority: 'High', className: 'high', text: 'Dispatch crew to inspect overloaded EV charging hub' },
  { priority: 'Med', className: 'medium', text: 'Rebalance bike-share docks near station exits' },
  { priority: 'Low', className: 'low', text: 'Audit sidewalk sensor calibration on school route' }
];

function openSidebar() {
  sidebar.classList.add('open');
  overlay.classList.add('open');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

function renderClock() {
  const now = new Date();
  clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  clockDate.textContent = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

function renderAlerts() {
  feedList.innerHTML = alerts.map(alert => `
    <article class="feed-item" data-risk="${alert.risk}" data-search="${alert.title} ${alert.detail} ${alert.risk}">
      <div class="feed-icon ${alert.type}"><i class="fa ${alert.icon}"></i></div>
      <div>
        <strong>${alert.title}</strong>
        <span>${alert.detail}</span>
      </div>
      <small class="feed-time">${alert.time}</small>
    </article>
  `).join('');
}

function updateHealthScore() {
  const gridLoad = Number(document.getElementById('gridLoad').textContent.replace('%', ''));
  const transit = Number(document.getElementById('transitScore').textContent.replace('%', ''));
  const water = Number(document.getElementById('waterScore').textContent.replace('%', ''));
  const emergency = Number(document.getElementById('emergencyLoad').textContent.replace('%', ''));
  const riskPenalty = alerts.filter(alert => alert.risk === 'high').length * 4;
  const score = Math.round((transit + water + (100 - gridLoad) + (100 - emergency)) / 4 - riskPenalty + 14);
  const clamped = Math.max(0, Math.min(99, score));
  const circumference = 314;

  healthScore.textContent = clamped;
  healthRing.style.strokeDashoffset = String(circumference - (clamped / 100) * circumference);
}

function filterByModule(section) {
  moduleCards.forEach(card => {
    const modules = card.dataset.module.split(' ');
    card.classList.toggle('hidden-by-filter', section !== 'overview' && !modules.includes(section));
  });
}

function filterBySearch(query) {
  const normalized = query.trim().toLowerCase();
  const searchableItems = document.querySelectorAll('.feed-item, #districtTable tbody tr, .ticket-list li, .kpi-card, .panel');

  searchableItems.forEach(item => {
    if (!normalized) {
      item.classList.remove('hidden-by-filter');
      return;
    }

    const text = item.textContent.toLowerCase();
    item.classList.toggle('hidden-by-filter', !text.includes(normalized));
  });
}

function updateDistrictReadout(name) {
  const district = districts[name];
  districtReadout.innerHTML = `
    <strong>${name}</strong>
    <span>Transit: ${district.transit}% · Energy: ${district.energy}% · Safety: ${district.safety} · AQI: ${district.aqi}</span>
  `;
}

function simulateTelemetry() {
  const transit = document.getElementById('transitScore');
  const grid = document.getElementById('gridLoad');
  const emergency = document.getElementById('emergencyLoad');
  const air = document.getElementById('airQuality');

  const transitValue = 91 + Math.floor(Math.random() * 6);
  const gridValue = 68 + Math.floor(Math.random() * 10);
  const emergencyValue = 14 + Math.floor(Math.random() * 9);
  const airValue = 36 + Math.floor(Math.random() * 13);

  transit.textContent = `${transitValue}%`;
  grid.textContent = `${gridValue}%`;
  emergency.textContent = `${emergencyValue}%`;
  air.textContent = `${airValue} AQI`;
  updateHealthScore();
}

menuButton.addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);

themeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  const icon = themeToggle.querySelector('i');
  icon.className = document.body.classList.contains('dark-mode') ? 'fa fa-sun-o' : 'fa fa-moon-o';
});

navLinks.forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    navLinks.forEach(nav => nav.classList.remove('active'));
    link.classList.add('active');
    filterByModule(link.dataset.section);
    closeSidebar();
  });
});

citySearch.addEventListener('input', event => {
  filterBySearch(event.target.value);
});

districtMarkers.forEach(marker => {
  marker.addEventListener('click', () => {
    districtMarkers.forEach(item => item.classList.remove('active'));
    marker.classList.add('active');
    updateDistrictReadout(marker.dataset.district);
  });
});

resolveAll.addEventListener('click', () => {
  alerts = alerts.filter(alert => alert.risk !== 'low');
  renderAlerts();
  updateHealthScore();
});

addTicket.addEventListener('click', () => {
  const template = ticketTemplates[Math.floor(Math.random() * ticketTemplates.length)];
  const ticket = document.createElement('li');
  ticket.innerHTML = `<span class="ticket-priority ${template.className}">${template.priority}</span><span>${template.text}</span><button>Assign</button>`;
  ticketList.prepend(ticket);
});

document.addEventListener('click', event => {
  if (event.target.matches('.ticket-list button')) {
    event.target.textContent = 'Assigned';
    event.target.disabled = true;
    event.target.style.opacity = '0.62';
  }
});

renderClock();
renderAlerts();
updateHealthScore();
setInterval(renderClock, 1000);
setInterval(simulateTelemetry, 5000);

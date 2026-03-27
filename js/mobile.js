export function renderMobileCards(data){
  const container = document.getElementById('mobileCardContainer');

  container.innerHTML = data.map(w => `
    <div class="mobile-card">
      <div>${w.work_id}</div>
    </div>
  `).join('');
}

import { loadDashboard } from './dashboard.js';

window.onload = () => {
  const id = new URLSearchParams(window.location.search).get('id');

  if(id){
    loadDashboard(id);
  }
};

/* =========================
   LOGIN MANAGER (login.js)
========================= */

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Tukar teks butang untuk UX yang baik
    if(submitBtn) submitBtn.disabled = true;
    if(submitBtn) submitBtn.innerText = 'Memverifikasi...';

    try {
        // Hantar permohonan ke Supabase Auth API
        const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                'apikey': SB_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.access_token) {
            // 1. Simpan token JWT untuk kegunaan headers RLS nanti
            localStorage.setItem('supabase_token', data.access_token);
            
            // 2. Set states yang diperlukan oleh ENGINE dalam session.js anda
            localStorage.setItem('loggedIn', 'true');
            localStorage.setItem('lastActivity', Date.now().toString());
            localStorage.removeItem('sessionExpired'); // Pastikan state expired lama dibuang

            // 3. Bawa pengguna masuk ke sistem utama
            window.location.replace('contract_schedule.html');
        } else {
            alert('Log masuk gagal: ' + (data.error_description || 'E-mel atau kata laluan salah.'));
        }
    } catch (error) {
        console.error('Ralat sistem:', error);
        alert('Ralat rangkaian. Sila cuba lagi.');
    } finally {
        if(submitBtn) submitBtn.disabled = false;
        if(submitBtn) submitBtn.innerText = 'Log Masuk';
    }
});

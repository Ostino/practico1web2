document.addEventListener('DOMContentLoaded', () => {
    const likeBtn = document.getElementById('likeBtn');
    const likeCount = document.getElementById('likeCount');
  
    if (likeBtn) {
      likeBtn.addEventListener('click', async () => {
        const restauranteId = likeBtn.dataset.id;
        const res = await fetch(`/like/${restauranteId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
  
        const data = await res.json();
  
        if (data.likes !== undefined) {
          likeCount.textContent = `${data.likes} likes`;
        }
      });
    }
  });
  
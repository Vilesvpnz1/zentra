    const originalTitle = document.title;

    const originalFavicon = document.querySelector("#favicon").href;



    const awayTitle = "Home";

    const awayFavicon = "https://cdn.jsdelivr.net/gh/tharun9772/Bloxcraft-UBG@main/Google_Classroom_Logo.svg.png"; 



    document.addEventListener("visibilitychange", () => {

      if (document.hidden) {

  

        document.title = awayTitle;



        const icon = document.querySelector("#favicon");

        icon.setAttribute("href", awayFavicon);

      } else {

       

        document.title = originalTitle;



        const icon = document.querySelector("#favicon");

        icon.setAttribute("href", originalFavicon);

      }

    }); 


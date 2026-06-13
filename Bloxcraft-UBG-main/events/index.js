const API =
"https://bloxcraftapires.bloxcraft-ubg.workers.dev";

const FALLBACK =
"https://cdn.jsdelivr.net/gh/tharun9772/One-Link@main/events.json";

const eventsDiv =
document.getElementById("events");

const modal =
document.getElementById("modal");

const editor =
document.getElementById("editor");

let EVENTS = [];

function openAdmin(){
  modal.style.display = "flex";
}

modal.onclick = e => {
  if(e.target === modal){
    modal.style.display = "none";
  }
};

async function loadEvents(){

  let data = null;

 
  try{

    const res = await fetch(
      API + "/events"
    );

    if(res.ok){
      data = await res.json();
    }

  }catch{}

 
  if(!data){

    try{

      const res = await fetch(
        FALLBACK
      );

      if(res.ok){
        data = await res.json();
      }

    }catch{}

  }

 
  if(
    !data ||
    data === "There Are No Events" ||
    (
      Array.isArray(data) &&
      data.length === 0
    )
  ){

    eventsDiv.innerHTML = `
      <div class="no-events">
        <h1>There Are No Events! Checkback Later.</h1>
        Events powerd by Cloudflare Workers
      </div>
    `;

    return;
  }

  EVENTS = data;

  renderEvents();
}

function renderEvents(){

  eventsDiv.innerHTML = "";

  EVENTS.forEach((event,index)=>{

    const card =
    document.createElement("div");

    card.className = "event";

    card.innerHTML = `
      <img
        class="banner"
        src="${event.img}"
      >

      <div class="overlay"></div>

      <div class="content">
        <h2>${event.name}</h2>

        <div class="tag">
          ${event.type}
        </div>
      </div>
    `;

    card.onclick = () => {

      if(event.type === "URL"){

        const iframe =
        document.createElement("iframe");

        iframe.src = event.url;

        document.body.appendChild(
          iframe
        );

      }

      if(event.type === "TOPURL"){
        top.location.href =
        event.url;
      }

      if(event.type === "URLPOPUP"){
        window.open(
          event.url,
          "_blank"
        );
      }

    };

    eventsDiv.appendChild(card);

  });

}

async function login(){

  const res = await fetch(
    API + "/login",
    {
      method:"POST",
      headers:{
        "Content-Type":
        "application/json"
      },
      body:JSON.stringify({
        username:
        username.value,

        password:
        password.value
      })
    }
  );

  const data =
  await res.json();

  if(!data.success){
    alert("Invalid Login");
    return;
  }

  localStorage.setItem(
    "token",
    data.token
  );

  loginBox.hidden = true;
  adminBox.hidden = false;

  renderEditor();
}

function renderEditor(){

  editor.innerHTML = "";

  EVENTS.forEach((event,index)=>{

    const div =
    document.createElement("div");

    div.className =
    "editor-item";

    div.innerHTML = `

      <input
        value="${event.name}"
        placeholder="Name"
        onchange="
          EVENTS[${index}].name =
          this.value
        "
      >

      <input
        value="${event.img}"
        placeholder="Image"
        onchange="
          EVENTS[${index}].img =
          this.value
        "
      >

      <select
        onchange="
          EVENTS[${index}].type =
          this.value
        "
      >

        <option
          ${event.type==="URL"?"selected":""}
        >
          URL
        </option>

        <option
          ${event.type==="TOPURL"?"selected":""}
        >
          TOPURL
        </option>

        <option
          ${event.type==="URLPOPUP"?"selected":""}
        >
          URLPOPUP
        </option>

      </select>

      <input
        value="${event.url}"
        placeholder="URL"
        onchange="
          EVENTS[${index}].url =
          this.value
        "
      >

      <button
        onclick="
          EVENTS.splice(${index},1);
          renderEditor();
        "
      >
        Delete
      </button>

    `;

    editor.appendChild(div);

  });

}

function addEvent(){

  EVENTS.push({
    name:"New Event",
    img:"",
    type:"URL",
    url:""
  });

  renderEditor();
}

async function saveEvents(){

  const res = await fetch(
    API + "/admin/events",
    {
      method:"POST",
      headers:{
        "Content-Type":
        "application/json",

        Authorization:
        localStorage.getItem(
          "token"
        )
      },
      body:JSON.stringify(EVENTS)
    }
  );

  const data =
  await res.json();

  if(!data.success){
    alert("Failed");
    return;
  }

  alert("Saved");

  modal.style.display = "none";

  renderEvents();
}

loadEvents();

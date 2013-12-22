/* Do some fun stuff with Javascript via UDP
   Eventually we will implement the SecretAPI here.  Eventually. */
var socArray = null;

// Constructor method for the holiday using SecretAPI
// Requires a string 'address' (i.e. IP address 192.168.0.20) or resolvable name (i.e. 'light.local')
//
function Holiday(address) {
  this.address = address;
  console.log("Address set to ", this.address)
  
  this.NUM_GLOBES = 50;
  this.FRAME_SIZE = 160;      // Secret API rame size
  this.FRAME_IGNORE = 10;     // Ignore the first 10 bytes of frame

  this.closeSocket = closeSocket;
  this.setglobe = setglobe;
  this.setstring = setstring;
  this.getglobe = getglobe;
  this.chase = chase;
  this.render = render;
  this.socketId = null;

  var globes = new Uint8Array(160);
  this.globes = globes;
  console.log('Array created');

  // Fill the header of the array with zeroes
  for (i=0; i < this.FRAME_IGNORE; i++) {
    this.globes[i] = 0x00;
  }

  // Create the socket we'll use to communicate with the Holiday
  chrome.socket.create('udp', {},
   function(socketInfo) {           // Callback when creation is complete
      // The socket is created, now we want to connect to the service
      socArray.push(socketInfo.socketId);
      console.log('socket created ', socArray[socArray.length-1]);

      for (q=0; q < hol.length; q++) {
        hol[q].socketId = socArray[q];
      }
    }
  );

  function closeSocket() {
    // Clean up after ourselves;
    chrome.socket.destroy(this.socketId);
    console.log("Socket destroyed");
  }

  function setglobe(globenum, r, g, b) {
    // Sets a globe's color
    if ((globenum < 0) || (globenum >= this.NUM_GLOBES)) {
      return;
    }

    baseptr = this.FRAME_IGNORE + 3*globenum;
    globes[baseptr] = r;
    globes[baseptr+1] = g;
    globes[baseptr+2] = b; 

    return;
  }

  function setstring(r, g, b) {
    // Sets the whole string to the same color very quickly.
    baseptr = this.FRAME_IGNORE;
    for (j = 0; j < this.NUM_GLOBES; j++) {
      globes[baseptr] = r;
      baseptr +=1
      globes[baseptr] = g;
      baseptr +=1
      globes[baseptr] = b;
      baseptr +=1
    }
    return;
  }

  function chase(r, g, b) {
    // Move all the globes up one position
    // Set the first globe to the passed RGB
    baseptr = this.FRAME_IGNORE;
    for (j = 0; j < (this.NUM_GLOBES-1); j++) {   // Move up
      globes[baseptr+3] = globes[baseptr];        // move R
      baseptr += 1;
      globes[baseptr+3] = globes[baseptr];        // Move G
      baseptr += 1;     
      globes[baseptr+3] = globes[baseptr];        // Move B
      baseptr += 1;  
    }
    this.setglobe(0, r, g, b);                    // Add bottom
  }

  function getglobe() {
    // Sets a globe's color
    if ((globenum < 0) || (globenum >= this.NUM_GLOBES)) {
      return;
    }

    baseptr = this.FRAME_IGNORE + 3*globenum;
    r = globes[baseptr];
    g = globes[baseptr+1];
    b = globes[baseptr+2];
    return [r,g,b];
  }


  function render() {
    //console.log("Holiday.render");
    //var locaddr = this.address;
    var glbs = this.globes;
    var sid = this.socketId;
    if (sid == null) {
      console.log("No socket abort render");
      return;
    }

    // Connect via the socket
    chrome.socket.connect(sid, this.address, 9988, function(result) {

       // We are now connected to the socket so send it some data
      chrome.socket.write(sid, glbs.buffer,
       function(sendInfo) {
         //console.log("wrote " + sendInfo.bytesWritten);
         return;
      });
    });
    return;
  }

}

var timer = null;
var holist = null
var hol = null;
var reentered = false;
var candela_color = [ 0xb0, 0x77, 0x1f ];

var candela_function = null;

var modder = null;

// Start Demo 
function candelaStart() {
  
  console.log("candelaStart");

  socArray = new Array();
  holist = new Array();
  $.each($('#checks').serializeArray(), function() {             
      holist.push(this.value) ;  
  })
  console.log(holist);    

  if (holist.length == 0) {
    return false;
  }

  // Create an array of Holidays.  Possibly.
  hol = new Array();
  for (j=0; j < holist.length; j++) {
    hol.push(new Holiday(holist[j]));
  }
  console.log(hol);

  // Array of values, zero it to start
  modder = Array(50);
  for (i=0; i < hol[0].NUM_GLOBES; i++) {
    modder[i] = 0.0;
  }
  timer = setInterval(candelaFrame, 40); // run every 40 msec / 25 hz
  $('#start').val('Stop');
  return true;

}

function candelaModulate () {
  // returns an RGB value based on the modulation
  return;
}

// Stop Demo 
function candelaStop() {
  
  console.log("candelaStop");
  clearInterval(timer);
  timer = null;
  for (i=0; i< hol.length; i++) {
    hol[i].closeSocket();
    hol[i] = null;
  }
  hol = null;
  socArray = null;
  modder = null;
  $('#start').val('Start');
  return;
  
}

function candelaFrame() {

  if (reentered == true) {    // Block reentry.
    console.log("reentry blocked");
    return;
  } else {
    reentered = true;
  }

  // Fill the whole frame with the color
  //hol.setstring(candela_color[0], candela_color[1], candela_color[2])

  for (j=0; j < hol[0].NUM_GLOBES; j++) {

    // We get another hit of noise, and add that in to modder, making sure it stays in range -1.0 < modder < 1.0
    var nv = noise.simplex2(modder[j], Math.random()) / 5.0;
    //var nv = noise.perlin2(modder[j], Math.random()) / 10.0;
    modder[j] = modder[j] + nv;
    if (modder[j] < -1.0) {
      modder[j] = -1.0;
    } else if (modder[j] > 1.0) {
      modder[j] = 1.0;
    }
    //console.log(modder[j], nv)

    ranger = (modder[j] + 1.0) / 2.0;

    //console.log(modder[j], ranger);

    // OK, let's use modder to adjust the colour here
    rm = Math.floor(candela_color[0] * ranger);
    gm = Math.floor(candela_color[1] * ranger);
    bm = Math.floor(candela_color[2] * ranger);

    for (i=0; i < hol.length; i++) {
      //console.log('setglobe', rm, gm, bm);
      hol[i].setglobe(j, rm, gm, bm);
    }
  }
  for (i=0; i < hol.length; i++) {
    hol[i].render();
  }

  reentered = false;
  return;
}

function doRefresh() {
  $("#thebutton").val('Scanning...');
  refresher();
}

var candelaState = false;

function doButton() {
  if (candelaState == false) {
    candelaState = candelaStart();
  } else {
    candelaStop();
    candelaState = false;
  }
}

// Lordy, this is one of the reasons I hate Javascript
// And it's not Javascript's fault.  It's the DOM.
$( document ).ready( function() {
  console.log("Doing the ready");
  noise.seed(Math.random());          // Seed the noise generation

  // And here's the stuff we do.
  $("#thebutton").click(function () {
    doRefresh();
  });
  $("#start").click(function () {
    doButton();
  });
});

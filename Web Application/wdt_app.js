// models

class Employee {
  constructor(data) {
    this.name = data.name;
    this.surname = data.surname;
  }
}

class Staff extends Employee {
  constructor(data) {
    super(data);

    this.picture = data.image;
    this.email = data.email_address;

    this.status = "In";
    this.outTime = "";
    this.duration = "";
    this.expectedReturn = "";
    this.expectedReturnMs = null;
    this.lateNotified = false;
  }
}

class Driver extends Employee {
  constructor(data) {
    super(data);

    this.vehicle = data.vehicle;
    this.phone = data.phone;
    this.address = data.address;

    this.returnTime = data.returnTime;
    this.returnTimeMs = data.returnTimeMs;
    this.lateNotified = false;
  }
}

// state

let staffList = [];
let selectedStaffIndex = null;

let deliveryList = [];
let selectedDeliveryIndex = null;

// staff section

const staffTableBody = document.getElementById("staff-table-body");

// helper: format duration in minutes into hr/min text
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} hr ${mins} min`;
  }

  if (hours > 0) {
    return `${hours} hr`;
  }

  return `${mins} min`;
}

// fetch staff data from api and build staff list
async function staffUserGet() {
  try {
    const response = await fetch("http://backend.restapi.co.za/items/staff");
    const json = await response.json();

    staffList = json.data.map((item) => new Staff(item));
    renderStaffTable();
  } catch (error) {
    console.error("failed to load staff data:", error);
  }
}

// render staff table and handle row selection
function renderStaffTable() {
  staffTableBody.innerHTML = "";

  staffList.forEach((staff, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><img src="${staff.picture}" alt="${staff.name}" class="staff-img"></td>
      <td>${staff.name}</td>
      <td>${staff.surname}</td>
      <td>${staff.email}</td>
      <td>${staff.status}</td>
      <td>${staff.outTime}</td>
      <td>${staff.duration}</td>
      <td>${staff.expectedReturn}</td>
    `;

    if (index === selectedStaffIndex) {
      tr.classList.add("selected-row");
    }

    tr.addEventListener("click", () => {
      selectedStaffIndex = index;
      renderStaffTable();
    });

    staffTableBody.appendChild(tr);
  });
}

// mark staff member as out and calculate expected return
function staffOut() {
  if (selectedStaffIndex === null) {
    alert("Please select a staff member first.");
    return;
  }

  const minutesInput = prompt("How many minutes will the staff member be out?");
  const minutes = Number(minutesInput);

  if (!minutesInput || isNaN(minutes) || minutes <= 0) {
    alert("Please enter a valid number of minutes.");
    return;
  }

  const selectedStaff = staffList[selectedStaffIndex];
  const now = new Date();

  // status
  selectedStaff.status = "Out";
  selectedStaff.lateNotified = false;

  // out time
  selectedStaff.outTime = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // duration
  selectedStaff.duration = formatDuration(minutes);

  // expected return time
  const expectedReturn = new Date(now.getTime() + minutes * 60000);

  selectedStaff.expectedReturn = expectedReturn.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  selectedStaff.expectedReturnMs = expectedReturn.getTime();

  // clear selection and refresh table
  selectedStaffIndex = null;
  renderStaffTable();
}

// reset staff member back to in/default
function staffIn() {
  if (selectedStaffIndex === null) {
    alert("Please select a staff member first.");
    return;
  }

  const selectedStaff = staffList[selectedStaffIndex];

  if (selectedStaff.status === "In") {
    alert("This staff member is already in the office.");
    return;
  }

  selectedStaff.status = "In";
  selectedStaff.lateNotified = false;

  selectedStaff.outTime = "";
  selectedStaff.duration = "";
  selectedStaff.expectedReturn = "";
  selectedStaff.expectedReturnMs = null;

  selectedStaffIndex = null;
  renderStaffTable();
}

// late toast (shared dom)

const lateToastElement = document.getElementById("lateToast");
const lateToastImg = document.getElementById("lateToastImg");
const lateToastEmoji = document.getElementById("lateToastEmoji");
const lateToastName = document.getElementById("lateToastName");
const lateToastMessage = document.getElementById("lateToastMessage");

// unified toast for staff + drivers
function showToast(type, person) {
  // staff mode
  if (type === "staff") {
    lateToastImg.style.display = "inline-block";
    lateToastEmoji.style.display = "none";
    lateToastEmoji.textContent = "";

    lateToastImg.src = person.picture;
    lateToastName.textContent = `${person.name} ${person.surname}`;
    lateToastMessage.textContent = "Late: 1 minute";
  }

  // driver mode
  if (type === "driver") {
    lateToastImg.style.display = "none";

    const vehicleEmoji = person.vehicle === "Car" ? "🚗" : "🏍️";
    lateToastEmoji.textContent = vehicleEmoji;
    lateToastEmoji.style.display = "inline-block";

    lateToastName.textContent = `${person.name} ${person.surname}`;
    lateToastMessage.innerHTML = `
      Phone: ${person.phone}<br>
      Return time: ${person.returnTime}<br>
      Address: ${person.address}<br>
      Late: 1 minute
    `;
  }

  const toast = new bootstrap.Toast(lateToastElement);
  toast.show();
}

// check if any staff member is late and update status
function staffMemberIsLate() {
  const now = Date.now();

  staffList.forEach((staff) => {
    if (staff.status !== "Out") {
      return;
    }

    const lateTime = staff.expectedReturnMs + 60000;

    if (now >= lateTime && !staff.lateNotified) {
      staff.status = "Late";
      staff.lateNotified = true;
      showToast("staff", staff);
    }
  });

  renderStaffTable();
}

// delivery / driver section

const deliveryBoardBody = document.getElementById("delivery-board-body");

const deliveryVehicleInput = document.getElementById("deliveryVehicle");
const driverNameInput = document.getElementById("driverName");
const driverSurnameInput = document.getElementById("driverSurname");
const driverPhoneInput = document.getElementById("driverPhone");
const deliveryAddressInput = document.getElementById("deliveryAddress");
const driverReturnTimeInput = document.getElementById("driverReturnTime");

// clear schedule delivery form inputs
function clearDeliveryForm() {
  deliveryVehicleInput.value = "Car";
  driverNameInput.value = "";
  driverSurnameInput.value = "";
  driverPhoneInput.value = "";
  deliveryAddressInput.value = "";
  driverReturnTimeInput.value = "";
}

// render delivery board and handle row selection
function renderDeliveryBoard() {
  deliveryBoardBody.innerHTML = "";

  deliveryList.forEach((driver, index) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${driver.vehicle === "Car" ? "🚗" : "🏍️"}</td>
      <td>${driver.name}</td>
      <td>${driver.surname}</td>
      <td>${driver.phone}</td>
      <td>${driver.address}</td>
      <td>${driver.returnTime}</td>
    `;

    if (index === selectedDeliveryIndex) {
      tr.classList.add("selected-row");
    }

    tr.addEventListener("click", () => {
      selectedDeliveryIndex = index;
      renderDeliveryBoard();
    });

    deliveryBoardBody.appendChild(tr);
  });
}

// validate delivery/driver input
function validateDelivery(data) {
  const vehicle = data.vehicle;
  const name = data.name;
  const surname = data.surname;
  const phone = data.phone;
  const address = data.address;
  const returnTime = data.returnTime;

  if (!vehicle || !name || !surname || !phone || !address || !returnTime) {
    alert("Please fill in all delivery fields.");
    return false;
  }

  if (isNaN(phone) || phone.length < 8) {
    alert("Please enter a valid phone number: digits only, at least 8 digits.");
    return false;
  }

  return true;
}

// add new delivery from form
function addDelivery() {
  const vehicle = deliveryVehicleInput.value;
  const name = driverNameInput.value.trim();
  const surname = driverSurnameInput.value.trim();
  const phone = driverPhoneInput.value.trim();
  const address = deliveryAddressInput.value.trim();
  const returnTime = driverReturnTimeInput.value;

  const driverData = {
    vehicle,
    name,
    surname,
    phone,
    address,
    returnTime,
  };

  if (!validateDelivery(driverData)) return;

  const timeParts = returnTime.split(":");
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);

  // setHours sets the date's time to today at given hour/minute
  // and also returns the timestamp in milliseconds
  const returnTimeMs = new Date().setHours(hours, minutes, 0, 0);

  driverData.returnTimeMs = returnTimeMs;

  const driver = new Driver(driverData);

  deliveryList.push(driver);

  clearDeliveryForm();
  renderDeliveryBoard();
}

// remove selected delivery from board
function removeDelivery() {
  if (selectedDeliveryIndex === null) {
    alert("Please select a delivery first.");
    return;
  }

  const selectedDriver = deliveryList[selectedDeliveryIndex];

  const confirmed = confirm(
    `Remove delivery for ${selectedDriver.name} ${selectedDriver.surname}?`
  );

  if (!confirmed) return;

  deliveryList.splice(selectedDeliveryIndex, 1);
  selectedDeliveryIndex = null;
  renderDeliveryBoard();
}

// check if any delivery driver is late and notify once
function deliveryDriverIsLate() {
  const now = Date.now();

  deliveryList.forEach((driver) => {
    const lateTime = driver.returnTimeMs + 60000; // 1-minute grace

    if (now >= lateTime && !driver.lateNotified) {
      driver.lateNotified = true;
      showToast("driver", driver);
    }
  });
}

// footer clock

const datetimeElement = document.getElementById("datetime");

// update footer date + time
function digitalClock() {
  const now = new Date();

  const dateString = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const timeString = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  datetimeElement.textContent = `${dateString} ${timeString}`;
}

// startup

function init() {
  staffUserGet();
  digitalClock();

  setInterval(digitalClock, 1000);
  setInterval(staffMemberIsLate, 1000);
  setInterval(deliveryDriverIsLate, 1000);
}

init();

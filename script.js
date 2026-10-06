const STORAGE_KEY = "timeclock_v3";

const defaultState = {
  manager: null,
  job: null,
  workerCode: "",
  workers: [],
  records: [],
  currentUser: null
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultState, ...JSON.parse(saved) };
    }
  } catch (error) {
    console.error("Could not load saved data:", error);
  }

  return { ...defaultState };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function app() {
  return document.getElementById("app");
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function generateCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const numbers = "23456789";

  let code = "";

  for (let i = 0; i < 3; i++) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }

  code += "-";

  for (let i = 0; i < 3; i++) {
    code += numbers[Math.floor(Math.random() * numbers.length)];
  }

  return code;
}

function formatDuration(ms) {
  if (!ms || ms < 0) return "0h 0m";

  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

function getWorker(id) {
  return state.workers.find(worker => worker.id === id);
}

function getWorkerRecords(workerId) {
  return state.records.filter(record => record.workerId === workerId);
}

function totalWorkerMilliseconds(workerId) {
  return getWorkerRecords(workerId)
    .filter(record => record.clockOut)
    .reduce((total, record) => {
      return total + (record.clockOut - record.clockIn);
    }, 0);
}

function activeRecord(workerId) {
  return state.records.find(
    record => record.workerId === workerId && !record.clockOut
  );
}

function showError(message) {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <div class="error">${escapeHTML(message)}</div>
        <div class="actions">
          <button class="secondary" onclick="welcome()">Back</button>
        </div>
      </div>
    </div>
  `;
}

function welcome() {
  app().innerHTML = `
    <div class="app">
      <div class="card center">
        <div class="icon">⏱️</div>
        <h1>TimeClock</h1>
        <p>Track work hours simply and easily.</p>

        <div class="roles">
          <div class="role" onclick="managerStart()">
            <div class="icon">👑</div>
            <h2>Manager</h2>
            <p>Create a job and manage workers.</p>
          </div>

          <div class="role" onclick="workerStart()">
            <div class="icon">👷</div>
            <h2>Worker</h2>
            <p>Join a job and track your hours.</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function managerStart() {
  if (state.manager) {
    managerLogin();
    return;
  }

  managerSetup();
}

function managerSetup() {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <h1>👑 Manager Setup</h1>
        <p>Create your manager account.</p>

        <label>Manager Name</label>
        <input id="managerName" placeholder="Your name">

        <label>Password</label>
        <input id="managerPassword" type="password" placeholder="Password">

        <label>Confirm Password</label>
        <input id="managerPassword2" type="password" placeholder="Confirm password">

        <div class="actions">
          <button class="primary" onclick="createManager()">Create Account</button>
          <button class="secondary" onclick="welcome()">Back</button>
        </div>
      </div>
    </div>
  `;
}

function createManager() {
  const name = document.getElementById("managerName").value.trim();
  const password = document.getElementById("managerPassword").value;
  const password2 = document.getElementById("managerPassword2").value;

  if (!name || !password) {
    showError("Please enter your name and password.");
    return;
  }

  if (password !== password2) {
    showError("The passwords do not match.");
    return;
  }

  state.manager = {
    name,
    password
  };

  state.currentUser = {
    role: "manager"
  };

  saveState();

  jobSetup();
}

function managerLogin() {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <h1>👑 Manager Sign In</h1>
        <p>Welcome back, ${escapeHTML(state.manager.name)}.</p>

        <label>Password</label>
        <input id="loginPassword" type="password" placeholder="Password">

        <div class="actions">
          <button class="primary" onclick="loginManager()">Sign In</button>
          <button class="secondary" onclick="welcome()">Back</button>
        </div>
      </div>
    </div>
  `;
}

function loginManager() {
  const password = document.getElementById("loginPassword").value;

  if (password !== state.manager.password) {
    showError("Incorrect password.");
    return;
  }

  state.currentUser = {
    role: "manager"
  };

  saveState();

  if (state.job) {
    managerDashboard();
  } else {
    jobSetup();
  }
}

function jobSetup() {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <h1>📋 Create Your Job</h1>
        <p>Set up the job workers will clock into.</p>

        <label>Job Name</label>
        <input id="jobName" placeholder="Example: Babysitting">

        <label>Description <span class="small">(Optional)</span></label>
        <textarea id="jobDescription" placeholder="Example: Watch my brother after school"></textarea>

        <div class="actions">
          <button class="primary" onclick="createJob()">Create Job</button>
          <button class="secondary" onclick="managerSignOut()">Sign Out</button>
        </div>
      </div>
    </div>
  `;
}

function createJob() {
  const name = document.getElementById("jobName").value.trim();
  const description = document.getElementById("jobDescription").value.trim();

  if (!name) {
    showError("Please enter a job name.");
    return;
  }

  state.job = {
    id: crypto.randomUUID(),
    name,
    description
  };

  state.workerCode = generateCode();

  saveState();

  managerDashboard();
}

function managerDashboard() {
  if (!state.manager || !state.job) {
    welcome();
    return;
  }

  state.currentUser = {
    role: "manager"
  };

  saveState();

  const workerCards = state.workers.length
    ? state.workers.map(worker => {
        const active = activeRecord(worker.id);
        const total = totalWorkerMilliseconds(worker.id);

        return `
          <div class="card">
            <div class="row">
              <div>
                <h3>${escapeHTML(worker.name)}</h3>
                <div class="small">
                  ${active ? "🟢 Currently Working" : "⚪ Clocked Out"}
                </div>
              </div>

              <strong>${formatDuration(total)}</strong>
            </div>

            <div class="actions">
              <button class="danger" onclick="removeWorker('${worker.id}')">
                Remove Worker
              </button>
            </div>
          </div>
        `;
      }).join("")
    : `
      <div class="card center">
        <p>No workers have joined yet.</p>
      </div>
    `;

  app().innerHTML = `
    <div class="app">

      <div class="card">
        <div class="row">
          <div>
            <h1>👑 Manager Dashboard</h1>
            <p>Welcome, ${escapeHTML(state.manager.name)}.</p>
          </div>

          <button class="secondary" onclick="managerSettings()">
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div class="card">
        <h2>${escapeHTML(state.job.name)}</h2>

        ${
          state.job.description
            ? `<p>${escapeHTML(state.job.description)}</p>`
            : `<p>No job description.</p>`
        }

        <div class="notice">
          Workers use the code below to join this job.
        </div>

        <div class="code">${escapeHTML(state.workerCode)}</div>

        <div class="actions">
          <button class="primary" onclick="copyWorkerCode()">
            📋 Copy Code
          </button>

          <button class="secondary" onclick="managerSettings()">
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div>
        <h2>Workers</h2>
        ${workerCards}
      </div>

      <div class="card">
        <h2>🕒 Recent Time Records</h2>

        ${
          state.records.length
            ? state.records.slice().reverse().slice(0, 10).map(record => {
                const worker = getWorker(record.workerId);

                return `
                  <div class="record">
                    <strong>
                      ${escapeHTML(worker ? worker.name : "Former Worker")}
                    </strong>

                    <div class="small">
                      Clocked in: ${formatDate(record.clockIn)}
                    </div>

                    <div class="small">
                      ${
                        record.clockOut
                          ? `Clocked out: ${formatDate(record.clockOut)}`
                          : "Currently working"
                      }
                    </div>

                    ${
                      record.clockOut
                        ? `<div>Duration: ${formatDuration(record.clockOut - record.clockIn)}</div>`
                        : ""
                    }
                  </div>
                `;
              }).join("")
            : `<p>No time records yet.</p>`
        }
      </div>

      <div class="card">
        <button class="danger" onclick="managerSignOut()">
          🚪 Sign Out
        </button>
      </div>

    </div>
  `;
}

function managerSettings() {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <h1>⚙️ Manager Settings</h1>

        <h2>Worker Access Code</h2>

        <div class="code">${escapeHTML(state.workerCode)}</div>

        <div class="actions">
          <button class="primary" onclick="copyWorkerCode()">
            📋 Copy Code
          </button>

          <button class="secondary" onclick="regenerateCode()">
            🔄 Generate New Code
          </button>
        </div>

        <p class="small">
          Generating a new code prevents new workers from joining with the old
          code. Existing workers stay connected.
        </p>
      </div>

      <div class="card">
        <h2>Job</h2>
        <strong>${escapeHTML(state.job.name)}</strong>

        ${
          state.job.description
            ? `<p>${escapeHTML(state.job.description)}</p>`
            : ""
        }
      </div>

      <div class="card">
        <div class="actions">
          <button class="secondary" onclick="managerDashboard()">
            ← Back to Dashboard
          </button>

          <button class="danger" onclick="managerSignOut()">
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  `;
}

function copyWorkerCode() {
  if (!state.workerCode) return;

  navigator.clipboard
    .writeText(state.workerCode)
    .then(() => {
      alert("Worker code copied!");
    })
    .catch(() => {
      alert(`Worker code: ${state.workerCode}`);
    });
}

function regenerateCode() {
  state.workerCode = generateCode();
  saveState();

  alert("A new worker code was generated.");
  managerSettings();
}

function managerSignOut() {
  state.currentUser = null;
  saveState();
  welcome();
}

function workerStart() {
  if (state.currentUser && state.currentUser.role === "worker") {
    const worker = getWorker(state.currentUser.workerId);

    if (worker) {
      workerDashboard(worker.id);
      return;
    }

    state.currentUser = null;
    saveState();
  }

  workerJoin();
}

function workerJoin() {
  app().innerHTML = `
    <div class="app">
      <div class="card">
        <h1>👷 Join Job</h1>
        <p>Enter your name and the worker code from your manager.</p>

        <label>Your Name</label>
        <input id="workerName" placeholder="Your name">

        <label>Worker Code</label>
        <input id="workerCode" placeholder="Example: ABC-123">

        <div class="actions">
          <button class="primary" onclick="joinWorker()">
            Join Job
          </button>

          <button class="secondary" onclick="welcome()">
            Back
          </button>
        </div>
      </div>
    </div>
  `;
}

function joinWorker() {
  const name = document.getElementById("workerName").value.trim();
  const code = document
    .getElementById("workerCode")
    .value
    .trim()
    .toUpperCase();

  if (!name || !code) {
    showError("Please enter your name and the worker code.");
    return;
  }

  if (!state.job || code !== state.workerCode) {
    showError("That worker code is not valid.");
    return;
  }

  let worker = state.workers.find(
    worker =>
      worker.name.toLowerCase() === name.toLowerCase()
  );

  if (!worker) {
    worker = {
      id: crypto.randomUUID(),
      name,
      joinedAt: Date.now()
    };

    state.workers.push(worker);
  }

  state.currentUser = {
    role: "worker",
    workerId: worker.id
  };

  saveState();

  workerDashboard(worker.id);
}

function workerDashboard(workerId) {
  const worker = getWorker(workerId);

  if (!worker || !state.job) {
    state.currentUser = null;
    saveState();
    welcome();
    return;
  }

  const active = activeRecord(workerId);
  const total = totalWorkerMilliseconds(workerId);

  app().innerHTML = `
    <div class="app">

      <div class="card">
        <div class="row">
          <div>
            <h1>👷 Worker Dashboard</h1>
            <p>Welcome, ${escapeHTML(worker.name)}.</p>
          </div>
        </div>
      </div>

      <div class="card center">
        <h2>${escapeHTML(state.job.name)}</h2>

        ${
          state.job.description
            ? `<p>${escapeHTML(state.job.description)}</p>`
            : ""
        }

        <div class="status ${active ? "working" : ""}">
          ${
            active
              ? "🟢 Currently Clocked In"
              : "⚪ Currently Clocked Out"
          }
        </div>

        ${
          active
            ? `
              <h2>Current Shift</h2>
              <div id="shiftTimer" class="code">
                ${formatDuration(Date.now() - active.clockIn)}
              </div>
            `
            : ""
        }

        <div class="actions">

          ${
            active
              ? `
                <button class="danger" onclick="clockOut('${worker.id}')">
                  ⏹️ Clock Out
                </button>
              `
              : `
                <button class="success" onclick="clockIn('${worker.id}')">
                  ▶️ Clock In
                </button>
              `
          }

        </div>
      </div>

      <div class="card">
        <h2>🕒 Your Hours</h2>

        <div class="code">
          ${formatDuration(total)}
        </div>
      </div>

      <div class="card">
        <h2>Recent Shifts</h2>

        ${
          getWorkerRecords(worker.id).length
            ? getWorkerRecords(worker.id)
                .slice()
                .reverse()
                .slice(0, 10)
                .map(record => `
                  <div class="record">
                    <div>
                      <strong>${formatDate(record.clockIn)}</strong>
                    </div>

                    <div class="small">
                      ${
                        record.clockOut
                          ? `Clocked out: ${formatDate(record.clockOut)}`
                          : "Currently working"
                      }
                    </div>

                    ${
                      record.clockOut
                        ? `<div>Duration: ${formatDuration(record.clockOut - record.clockIn)}</div>`
                        : ""
                    }
                  </div>
                `)
                .join("")
            : `<p>No shifts recorded yet.</p>`
        }
      </div>

      <div class="card">
        <button class="danger" onclick="workerSignOut()">
          🚪 Sign Out
        </button>
      </div>

    </div>
  `;

  if (active) {
    startShiftTimer(worker.id);
  }
}

function clockIn(workerId) {
  if (activeRecord(workerId)) {
    alert("You are already clocked in.");
    return;
  }

  state.records.push({
    id: crypto.randomUUID(),
    workerId,
    clockIn: Date.now(),
    clockOut: null
  });

  saveState();

  workerDashboard(workerId);
}

function clockOut(workerId) {
  const record = activeRecord(workerId);

  if (!record) {
    alert("You are not currently clocked in.");
    return;
  }

  record.clockOut = Date.now();

  saveState();

  workerDashboard(workerId);
}

function startShiftTimer(workerId) {
  const timer = document.getElementById("shiftTimer");

  if (!timer) return;

  const interval = setInterval(() => {
    const active = activeRecord(workerId);

    if (!active || !document.getElementById("shiftTimer")) {
      clearInterval(interval);
      return;
    }

    document.getElementById("shiftTimer").textContent =
      formatDuration(Date.now() - active.clockIn);
  }, 1000);
}

function workerSignOut() {
  state.currentUser = null;
  saveState();
  welcome();
}

function removeWorker(workerId) {
  const worker = getWorker(workerId);

  if (!worker) return;

  const confirmed = confirm(
    `Remove ${worker.name} from this job? Their existing time records will stay saved.`
  );

  if (!confirmed) return;

  state.workers = state.workers.filter(
    worker => worker.id !== workerId
  );

  saveState();

  managerDashboard();
}

function restoreSession() {
  if (!state.currentUser) {
    welcome();
    return;
  }

  if (state.currentUser.role === "manager") {
    if (state.manager && state.job) {
      managerDashboard();
    } else if (state.manager) {
      jobSetup();
    } else {
      welcome();
    }

    return;
  }

  if (state.currentUser.role === "worker") {
    const worker = getWorker(state.currentUser.workerId);

    if (worker && state.job) {
      workerDashboard(worker.id);
    } else {
      state.currentUser = null;
      saveState();
      welcome();
    }

    return;
  }

  welcome();
}

// Start the app and restore the previous login.
restoreSession();

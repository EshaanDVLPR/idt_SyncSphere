const loginForm = document.querySelector("[data-login-form]");

if (loginForm) {
  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(loginForm);
    const name = String(data.get("name") || "Student").trim();
    localStorage.setItem("syncsphere-user", name || "Student");
    window.location.href = "dashboard.html";
  });
}

const pageHost = document.querySelector("[data-page]");

if (pageHost) {
  const userName = localStorage.getItem("syncsphere-user") || "Student";
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const state = {
    userName,
    page: "home",
    activeChatId: "kavya",
    compareFriendId: "kavya",
    syncTimeSubtab: "timetable",
    chats: {
      kavya: {
        name: "Kavya",
        role: "Photography Club",
        messages: [
          { from: "other", text: "Hey! Want to do the coffee SyncQuest tomorrow?" },
          { from: "self", text: "Yes, 4 PM after classes works for me." }
        ]
      },
      zayan: {
        name: "Zayan",
        role: "Debate Society",
        messages: [
          { from: "other", text: "I found an open mic event this Friday." },
          { from: "self", text: "Great, please send me the registration link." }
        ]
      },
      meera: {
        name: "Meera",
        role: "Coding + Chess",
        messages: [
          { from: "other", text: "Could we practice introducing ourselves for 5 mins?" }
        ]
      }
    },
    userSchedule: [
      { day: "Mon", start: 9, end: 10.5, label: "Math", type: "class", fixed: true },
      { day: "Mon", start: 11, end: 12.5, label: "Physics", type: "class", fixed: true },
      { day: "Mon", start: 16, end: 17, label: "Gym", type: "hobby", fixed: false },
      { day: "Tue", start: 10, end: 11.5, label: "English", type: "class", fixed: true },
      { day: "Tue", start: 14, end: 15, label: "Study Block", type: "study", fixed: false },
      { day: "Wed", start: 9.5, end: 11, label: "Computer Lab", type: "class", fixed: true },
      { day: "Thu", start: 12, end: 13, label: "Coffee Walk", type: "hobby", fixed: false },
      { day: "Fri", start: 11, end: 12, label: "Presentation Skills", type: "class", fixed: true }
    ],
    friendSchedules: {
      kavya: [
        { day: "Mon", start: 9, end: 10, label: "Chemistry", type: "class", fixed: true },
        { day: "Mon", start: 16, end: 17.5, label: "Photography Meet", type: "hobby", fixed: false },
        { day: "Tue", start: 10, end: 11, label: "English", type: "class", fixed: true },
        { day: "Wed", start: 9.5, end: 11, label: "Computer Lab", type: "class", fixed: true },
        { day: "Thu", start: 13, end: 14, label: "Library", type: "study", fixed: false },
        { day: "Fri", start: 15, end: 16, label: "Open Mic Prep", type: "hobby", fixed: false }
      ],
      zayan: [
        { day: "Mon", start: 10, end: 11, label: "Economics", type: "class", fixed: true },
        { day: "Tue", start: 12, end: 13.5, label: "Debate Practice", type: "hobby", fixed: false },
        { day: "Wed", start: 15, end: 16, label: "Study", type: "study", fixed: false },
        { day: "Fri", start: 11, end: 12, label: "Presentation Skills", type: "class", fixed: true }
      ],
      meera: [
        { day: "Mon", start: 11, end: 12, label: "Discrete Math", type: "class", fixed: true },
        { day: "Tue", start: 15, end: 16, label: "Chess Club", type: "hobby", fixed: false },
        { day: "Thu", start: 10, end: 11.5, label: "Algorithms", type: "class", fixed: true },
        { day: "Sat", start: 17, end: 18, label: "Hackathon Prep", type: "study", fixed: false }
      ]
    }
  };

  function timeLabel(value) {
    const hour = Math.floor(value);
    const mins = value % 1 === 0.5 ? "30" : "00";
    return `${String(hour).padStart(2, "0")}:${mins}`;
  }

  function overlapMins(aStart, aEnd, bStart, bEnd) {
    const start = Math.max(aStart, bStart);
    const end = Math.min(aEnd, bEnd);
    return Math.max(0, end - start) * 60;
  }

  function computeCompare(friendId) {
    const mine = state.userSchedule;
    const theirs = state.friendSchedules[friendId] || [];
    const commonClasses = [];
    let totalCommonFree = 0;
    const commonFreeSlots = [];

    mine.forEach((myBlock) => {
      theirs.forEach((theirBlock) => {
        if (myBlock.day !== theirBlock.day) return;
        const mins = overlapMins(myBlock.start, myBlock.end, theirBlock.start, theirBlock.end);
        if (mins < 30) return;

        if (myBlock.type === "class" && theirBlock.type === "class") {
          commonClasses.push({ day: myBlock.day, overlap: mins, label: `${myBlock.label} + ${theirBlock.label}` });
        }
      });
    });

    days.forEach((day) => {
      for (let slot = 8; slot < 20; slot += 0.5) {
        const myBusy = mine.some((b) => b.day === day && slot >= b.start && slot < b.end);
        const theirBusy = theirs.some((b) => b.day === day && slot >= b.start && slot < b.end);
        if (!myBusy && !theirBusy) {
          totalCommonFree += 30;
          commonFreeSlots.push({ day, start: slot, end: slot + 0.5 });
        }
      }
    });

    return { commonClasses, commonFreeSlots, totalCommonFree };
  }

  function computePlanSuggestions(friendId) {
    const mine = state.userSchedule;
    const theirs = state.friendSchedules[friendId] || [];
    const suggestions = [];

    mine.filter((b) => !b.fixed).forEach((flex) => {
      const currentOverlap = theirs.reduce((sum, tb) => {
        if (tb.day !== flex.day) return sum;
        return sum + overlapMins(flex.start, flex.end, tb.start, tb.end);
      }, 0);

      days.forEach((day) => {
        for (let slot = 8; slot <= 19; slot += 0.5) {
          const duration = flex.end - flex.start;
          const newStart = slot;
          const newEnd = slot + duration;
          if (newEnd > 20) continue;
          const hasCollision = mine.some((block) => {
            if (block === flex) return false;
            if (block.day !== day) return false;
            return overlapMins(newStart, newEnd, block.start, block.end) > 0;
          });
          if (hasCollision) continue;

          const newOverlap = theirs.reduce((sum, tb) => {
            if (tb.day !== day) return sum;
            return sum + overlapMins(newStart, newEnd, tb.start, tb.end);
          }, 0);

          const gain = newOverlap - currentOverlap;
          if (gain >= 30) {
            suggestions.push({
              label: flex.label,
              from: `${flex.day} ${timeLabel(flex.start)}-${timeLabel(flex.end)}`,
              to: `${day} ${timeLabel(newStart)}-${timeLabel(newEnd)}`,
              gain
            });
          }
        }
      });
    });

    return suggestions.sort((a, b) => b.gain - a.gain).slice(0, 4);
  }

  function renderScheduleRows(schedule) {
    if (!schedule.length) return `<p class="muted">No timetable entries yet.</p>`;
    return schedule
      .slice()
      .sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.start - b.start)
      .map(
        (b) => `
          <article class="card timetable-item">
            <div>
              <h4>${b.label}</h4>
              <p class="muted">${b.day} - ${timeLabel(b.start)} - ${timeLabel(b.end)}</p>
            </div>
            <div class="chip-row">
              <span class="chip chip-${b.type}">${b.type}</span>
              <span class="chip ${b.fixed ? "chip-fixed" : "chip-flex"}">${b.fixed ? "fixed" : "flex"}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderSyncTime() {
    const subtab = state.syncTimeSubtab;
    const friendOptions = Object.entries(state.chats)
      .map(([id, chat]) => `<option value="${id}" ${id === state.compareFriendId ? "selected" : ""}>${chat.name}</option>`)
      .join("");
    const compare = computeCompare(state.compareFriendId);
    const suggestions = computePlanSuggestions(state.compareFriendId);
    const topFree = compare.commonFreeSlots.slice(0, 6);

    const timetableView = `
      <article class="card">
        <h3>Add block</h3>
        <form class="card-form" data-timetable-form>
          <label>Title <input name="label" placeholder="Design Studio" required /></label>
          <label>Day
            <select name="day">${days.map((d) => `<option value="${d}">${d}</option>`).join("")}</select>
          </label>
          <div class="row two-col">
            <label>Start
              <select name="start">${Array.from({ length: 24 }, (_, i) => 8 + i * 0.5)
                .map((v) => `<option value="${v}">${timeLabel(v)}</option>`)
                .join("")}</select>
            </label>
            <label>End
              <select name="end">${Array.from({ length: 24 }, (_, i) => 8.5 + i * 0.5)
                .map((v) => `<option value="${v}">${timeLabel(v)}</option>`)
                .join("")}</select>
            </label>
          </div>
          <label>Type
            <select name="type">
              <option value="class">Class</option>
              <option value="study">Study</option>
              <option value="hobby">Hobby</option>
            </select>
          </label>
          <label>Block behavior
            <select name="fixed">
              <option value="true">Fixed (cannot move)</option>
              <option value="false">Flexible (can move)</option>
            </select>
          </label>
          <button class="btn btn-primary" type="submit">Add to timetable</button>
        </form>
      </article>
      <div class="list" style="margin-top:1rem">${renderScheduleRows(state.userSchedule)}</div>
    `;

    const compareView = `
      <article class="card">
        <form class="row" data-compare-form>
          <select name="friendId">${friendOptions}</select>
          <button class="btn btn-primary" type="submit">Compare</button>
        </form>
      </article>
      <div class="grid" style="margin-top:1rem">
        <article class="card"><h3>Common free time</h3><p class="muted">${Math.round(compare.totalCommonFree / 60)} hours/week overlap.</p></article>
        <article class="card"><h3>Common classes</h3><p class="muted">${compare.commonClasses.length} class overlaps.</p></article>
        <article class="card"><h3>Best next slot</h3><p class="muted">${
          topFree[0] ? `${topFree[0].day} ${timeLabel(topFree[0].start)}-${timeLabel(topFree[0].end)}` : "No slots found"
        }</p></article>
      </div>
      <article class="card" style="margin-top:1rem">
        <h3>Top common free slots</h3>
        <div class="message-list">
          ${
            topFree.length
              ? topFree
                  .map(
                    (f) => `<div class="message"><strong>${f.day}</strong><span class="muted">${timeLabel(f.start)}-${timeLabel(
                      f.end
                    )}</span></div>`
                  )
                  .join("")
              : '<p class="muted">No common free slots in current range.</p>'
          }
        </div>
      </article>
    `;

    const planView = `
      <article class="card">
        <h3>Recommendation for ${state.chats[state.compareFriendId].name}</h3>
        <p class="muted">Classes remain fixed. Only flexible hobby/study blocks are moved.</p>
      </article>
      <div class="list" style="margin-top:1rem">
        ${
          suggestions.length
            ? suggestions
                .map(
                  (s) => `
                <article class="card">
                  <h4>${s.label}</h4>
                  <p class="muted">Move from ${s.from} to ${s.to}</p>
                  <div class="chip-row">
                    <span class="chip">+${Math.round(s.gain)} min overlap</span>
                    <button class="btn btn-ghost" data-apply-plan="${s.label}">Apply in prototype</button>
                  </div>
                </article>
              `
                )
                .join("")
            : '<article class="card"><p class="muted">No high-impact moves found right now.</p></article>'
        }
      </div>
    `;

    let subContent = timetableView;
    if (subtab === "compare") subContent = compareView;
    if (subtab === "syncplan") subContent = planView;

    return `
      <div class="content-header">
        <div>
          <h1>SyncTime</h1>
          <p>Manage timetable, compare with friends, and get free-time optimization suggestions.</p>
        </div>
      </div>
      <div class="subtabs">
        <button class="subtab-btn ${subtab === "timetable" ? "active" : ""}" data-sync-subtab="timetable">My Timetable</button>
        <button class="subtab-btn ${subtab === "compare" ? "active" : ""}" data-sync-subtab="compare">Compare</button>
        <button class="subtab-btn ${subtab === "syncplan" ? "active" : ""}" data-sync-subtab="syncplan">SyncPlan</button>
      </div>
      <div style="margin-top:0.9rem">${subContent}</div>
    `;
  }

  const pageTemplates = {
    home: () => `
      <div class="content-header">
        <div>
          <h1>Welcome, ${state.userName}</h1>
          <p>Today is a good day to make one meaningful connection.</p>
        </div>
      </div>

      <div class="grid">
        <article class="card">
          <h3>Connections this week</h3>
          <p class="muted">You spoke with 6 students and completed 3 SyncQuests.</p>
        </article>
        <article class="card">
          <h3>Streak</h3>
          <p class="muted">9 day social confidence streak. Keep going.</p>
        </article>
        <article class="card">
          <h3>Next event</h3>
          <p class="muted">Campus Story Circle - Today at 6:00 PM</p>
        </article>
      </div>

      <div class="split" style="margin-top:1rem">
        <article class="card">
          <h3>Suggested friends</h3>
          <div class="message-list">
            <div class="message"><strong>Kavya</strong><span class="muted">Photography, Journaling</span></div>
            <div class="message"><strong>Rishit</strong><span class="muted">Music, Public speaking</span></div>
            <div class="message"><strong>Meera</strong><span class="muted">Chess, Hackathons</span></div>
          </div>
        </article>
        <article class="card">
          <h3>Daily social prompt</h3>
          <p class="muted">"Ask one classmate what hobby they started this year."</p>
          <div class="chip-row">
            <span class="chip">Starter friendly</span>
            <span class="chip">2-5 mins</span>
          </div>
        </article>
      </div>
    `,
    quests: () => `
      <div class="content-header">
        <div>
          <h1>SyncQuests</h1>
          <p>Daily and weekly challenges to build confidence with consistency.</p>
        </div>
      </div>
      <div class="list">
        <article class="card quest">
          <div>
            <h4>Have coffee with someone new</h4>
            <p class="muted">Invite one student from your class for a 15-minute coffee break.</p>
          </div>
          <span class="priority daily">Daily</span>
        </article>
        <article class="card quest">
          <div>
            <h4>Practice a self-introduction</h4>
            <p class="muted">Record or perform a 45-second intro with a friend.</p>
          </div>
          <span class="priority daily">Daily</span>
        </article>
        <article class="card quest">
          <div>
            <h4>Attend one speaking event</h4>
            <p class="muted">Join any speaking circle, toastmaster meet, or open mic this week.</p>
          </div>
          <span class="priority weekly">Weekly</span>
        </article>
      </div>
    `,
    events: () => `
      <div class="content-header">
        <div>
          <h1>Events</h1>
          <p>Find opportunities to improve speaking and social comfort.</p>
        </div>
      </div>
      <div class="grid">
        <article class="card">
          <h4>Campus Story Circle</h4>
          <p class="muted">Share a 2-minute personal story in small groups.</p>
          <div class="chip-row"><span class="chip">Today 6 PM</span><span class="chip">Auditorium B</span></div>
        </article>
        <article class="card">
          <h4>Debate Warmup Room</h4>
          <p class="muted">Argument framing and confidence drills for beginners.</p>
          <div class="chip-row"><span class="chip">Wed 5 PM</span><span class="chip">Room C12</span></div>
        </article>
        <article class="card">
          <h4>Open Mic Practice</h4>
          <p class="muted">Try spoken word, intros, and short talks in a safe circle.</p>
          <div class="chip-row"><span class="chip">Fri 7 PM</span><span class="chip">Amphi lawn</span></div>
        </article>
      </div>
    `,
    synctime: () => renderSyncTime(),
    dm: () => {
      const contacts = Object.entries(state.chats)
        .map(
          ([id, chat]) => `
            <button class="dm-contact ${state.activeChatId === id ? "active" : ""}" data-chat-id="${id}">
              <strong>${chat.name}</strong>
              <div class="muted">${chat.role}</div>
            </button>
          `
        )
        .join("");

      const activeChat = state.chats[state.activeChatId];
      const messages = activeChat.messages
        .map((m) => `<div class="bubble ${m.from}">${m.text}</div>`)
        .join("");

      return `
        <div class="content-header">
          <div>
            <h1>Direct Messages</h1>
            <p>Build friendships one conversation at a time.</p>
          </div>
        </div>
        <section class="dm-shell">
          <aside class="dm-contacts">${contacts}</aside>
          <article class="dm-thread">
            <h3>${activeChat.name}</h3>
            <p class="muted">${activeChat.role}</p>
            <div style="margin: 1rem 0">${messages}</div>
            <form class="row" data-message-form>
              <input name="message" placeholder="Type a message..." required />
              <button class="btn btn-primary" type="submit">Send</button>
            </form>
          </article>
        </section>
      `;
    },
    profile: () => `
      <div class="content-header">
        <div>
          <h1>My Profile</h1>
          <p>Show what you enjoy so the right people can find you.</p>
        </div>
      </div>
      <div class="split">
        <article class="card">
          <h3>${state.userName}</h3>
          <p class="muted">2nd Year Student - Building confidence in conversations</p>
          <div class="chip-row">
            <span class="chip">Reading</span>
            <span class="chip">Design</span>
            <span class="chip">Public Speaking</span>
            <span class="chip">Coffee Walks</span>
          </div>
          <p style="margin-top:1rem" class="muted">
            "I want to meet kind and curious people to explore hobbies and improve communication."
          </p>
        </article>
        <article class="card">
          <h3>Edit basics</h3>
          <form class="card-form" data-profile-form>
            <label>Name <input name="profileName" value="${state.userName}" required /></label>
            <label>Bio <textarea name="bio" rows="4">I am trying to become a more confident speaker.</textarea></label>
            <button class="btn btn-primary" type="submit">Save profile</button>
          </form>
        </article>
      </div>
    `,
    settings: () => `
      <div class="content-header">
        <div>
          <h1>Settings</h1>
          <p>Customize your prototype preferences.</p>
        </div>
      </div>
      <div class="split">
        <article class="card">
          <h3>App preferences</h3>
          <form class="card-form" data-settings-form>
            <label>
              Discovery mode
              <select name="mode">
                <option value="nearby">Nearby campus students</option>
                <option value="interest">Interest-first matching</option>
                <option value="hybrid">Hybrid mode</option>
              </select>
            </label>
            <label>
              Daily quest reminders
              <select name="reminders">
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <button class="btn btn-primary" type="submit">Save settings</button>
          </form>
        </article>
        <article class="card">
          <h3>Account</h3>
          <p class="muted">Signed in as ${state.userName}</p>
          <button class="btn btn-ghost" data-logout>Log out</button>
        </article>
      </div>
    `
  };

  const pageTitle = {
    home: "Home",
    quests: "SyncQuests",
    events: "Events",
    synctime: "SyncTime",
    dm: "Direct Message",
    profile: "My Profile",
    settings: "Settings"
  };

  function render() {
    const titleNode = document.querySelector("[data-page-title]");
    if (titleNode) titleNode.textContent = pageTitle[state.page] || "SyncSphere";
    pageHost.innerHTML = pageTemplates[state.page]();

    document.querySelectorAll("[data-nav]").forEach((button) => {
      button.classList.toggle("active", button.dataset.nav === state.page);
    });
  }

  function setupEvents() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const navButton = target.closest("[data-nav]");
      if (navButton instanceof HTMLElement) {
        state.page = navButton.dataset.nav || "home";
        render();
      }

      const subtabButton = target.closest("[data-sync-subtab]");
      if (subtabButton instanceof HTMLElement) {
        state.syncTimeSubtab = subtabButton.dataset.syncSubtab || "timetable";
        state.page = "synctime";
        render();
      }

      const contactButton = target.closest("[data-chat-id]");
      if (contactButton instanceof HTMLElement) {
        state.activeChatId = contactButton.dataset.chatId || state.activeChatId;
        render();
      }

      if (target.hasAttribute("data-logout")) {
        localStorage.removeItem("syncsphere-user");
        window.location.href = "index.html";
      }

      if (target.hasAttribute("data-apply-plan")) {
        alert("Applied in prototype view. This does not change real class schedules.");
      }
    });

    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      if (form.matches("[data-message-form]")) {
        event.preventDefault();
        const formData = new FormData(form);
        const message = String(formData.get("message") || "").trim();
        if (!message) return;
        state.chats[state.activeChatId].messages.push({ from: "self", text: message });
        form.reset();
        render();
      }

      if (form.matches("[data-profile-form]")) {
        event.preventDefault();
        const formData = new FormData(form);
        const nextName = String(formData.get("profileName") || "Student").trim() || "Student";
        state.userName = nextName;
        localStorage.setItem("syncsphere-user", nextName);
        render();
      }

      if (form.matches("[data-settings-form]")) {
        event.preventDefault();
        alert("Prototype setting saved.");
      }

      if (form.matches("[data-compare-form]")) {
        event.preventDefault();
        const formData = new FormData(form);
        state.compareFriendId = String(formData.get("friendId") || "kavya");
        state.page = "synctime";
        state.syncTimeSubtab = "compare";
        render();
      }

      if (form.matches("[data-timetable-form]")) {
        event.preventDefault();
        const formData = new FormData(form);
        const label = String(formData.get("label") || "Untitled").trim();
        const day = String(formData.get("day") || "Mon");
        const start = Number(formData.get("start"));
        const end = Number(formData.get("end"));
        const type = String(formData.get("type") || "study");
        const fixed = String(formData.get("fixed")) === "true";

        if (!label || end <= start) {
          alert("Please enter a valid title and end time after start time.");
          return;
        }

        const collides = state.userSchedule.some((b) => {
          if (b.day !== day) return false;
          return overlapMins(start, end, b.start, b.end) > 0;
        });

        if (collides) {
          alert("This block overlaps with an existing timetable item.");
          return;
        }

        state.userSchedule.push({ day, start, end, label, type, fixed });
        form.reset();
        state.page = "synctime";
        state.syncTimeSubtab = "timetable";
        render();
      }
    });
  }

  setupEvents();
  render();
}

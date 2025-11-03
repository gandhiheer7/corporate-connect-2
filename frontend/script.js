document.addEventListener("DOMContentLoaded", () => {
  // We need this line to access the jsPDF library
  const { jsPDF } = window.jspdf;

  // NEW: Data for the 5 packages
  const activities = [
    { id: "pkg1", name: "Forest Bathing", description: "A guided nature immersion that awakens the senses and centres attention.", isCeoDinner: false, img: "https://placehold.co/400x250/22c55e/white?text=Forest+Bathing" },
    { id: "pkg2", name: "The Power of Presence", description: "A short orientation on mindfulness as a leadership competency - exploring the connection between awareness, attention, and emotional agility.", isCeoDinner: false, img: "https://placehold.co/400x250/3b82f6/white?text=Art+Therapy" },
    { id: "pkg3", name: "Mindfulness through Art Therapy", description: "An expressive arts session that invites reflection and creativity through colour, movement, and form.", isCeoDinner: false, img: "https://placehold.co/400x250/8b5cf6/white?text=Mindful+Eating" },
    { id: "pkg4", name: "Sound Therapy & Mindful Listening", description: "Immerse in live acoustic instruments and sound vibrations that harmonise internal rhythms.", isCeoDinner: false, img: "https://placehold.co/400x250/ec4899/white?text=Sound+Bath" },
    { id: "pkg5-ceo", name: "CEO / Director's Curated Dinner", description: "An exclusive, high-level networking and strategy dinner hosted in a premium setting.", isCeoDinner: true, img: "https://placehold.co/400x250/eab308/white?text=CEO+Dinner" },
  ];

  let selectedItems = [];

  // DOM elements
  const packageContainer = document.getElementById("package-container");
  const selectedItemsContainer = document.getElementById("selected-items");
  const proposalRequestBtn = document.getElementById("proposal-request-btn");
  const proposalForm = document.getElementById("proposal-form");
  const formMessage = document.getElementById("form-message");
  const headerImg = document.getElementById('pdf-header-image');
  let headerImgData = null;

  // Pre-load the image into a format jsPDF can use
  headerImg.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      canvas.width = headerImg.naturalWidth;
      canvas.height = headerImg.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(headerImg, 0, 0);
      headerImgData = canvas.toDataURL('image/png');
  });
  if (headerImg.complete && headerImg.naturalWidth > 0) {
      headerImg.dispatchEvent(new Event('load'));
  }

  // Render the 5 package cards
  function renderPackages() {
    packageContainer.innerHTML = activities.map(activity => `
      <div class="package-card">
        <img src="${activity.img}" alt="${activity.name}">
        <div class="package-card-content">
          <h4>${activity.name}</h4>
          <p class="pkg-description">${activity.description}</p>
          <button class="add-btn" data-id="${activity.id}">+</button>
        </div>
      </div>
    `).join('');
  }

  // Event listener for add/remove buttons
  document.addEventListener("click", (e) => {
    // Handle Add Button Clicks
    if (e.target.matches(".add-btn") && !e.target.classList.contains("added")) {
      const activityId = e.target.dataset.id;
      addActivity(activityId, e.target);
    } 
    // Handle Remove Button Clicks
    else if (e.target.matches(".remove-btn")) {
      const activityId = e.target.dataset.id;
      removeActivity(activityId);
    }
  });

  function addActivity(activityId, buttonElement) {
    const activity = activities.find((item) => item.id === activityId);
    
    // Check if item is already added
    if (activity && selectedItems.find((item) => item.id === activityId)) {
        showMessage("This activity has already been selected.", "error");
        setTimeout(() => showMessage("", ""), 2000); // Clear message
        return;
    }

    if (activity) {
      selectedItems.push(activity);
      buttonElement.textContent = "✓ Added";
      buttonElement.classList.add("added");
      updateSummary();
    }
  }

  function removeActivity(activityId) {
    selectedItems = selectedItems.filter((item) => item.id !== activityId);
    const addButton = document.querySelector(`.add-btn[data-id="${activityId}"]`);
    if (addButton) {
      addButton.textContent = "+";
      addButton.classList.remove("added");
    }
    updateSummary();
  }

  function updateSummary() {
    if (selectedItems.length === 0) {
      selectedItemsContainer.innerHTML = '<p class="empty-message">No initiatives selected yet.</p>';
    } else {
      selectedItemsContainer.innerHTML = selectedItems.map((item) => `
        <div class="selected-item">
          <div class="item-info">
            <h4>${item.name}</h4>
          </div>
          <button class="remove-btn" data-id="${item.id}">Remove</button>
        </div>
      `).join("");
    }
    proposalRequestBtn.disabled = selectedItems.length === 0;
  }

  // Event listener for the "Send Me Proposal" button
  proposalRequestBtn.addEventListener("click", () => {
    proposalRequestBtn.classList.add("hidden");
    proposalForm.classList.remove("hidden");
    showMessage("", ""); 
  });

  // --- NEW: Real-time validation for Contact Number ---
  const contactInput = document.getElementById("user-contact");
  contactInput.addEventListener("input", (e) => {
    if (e.target.value.length >= 10) {
      e.target.classList.remove("input-invalid");
    } else {
      e.target.classList.add("input-invalid");
    }
  });
  // --- END OF NEW VALIDATION ---
  
  // MODIFIED: This function now uses jsPDF to manually build the PDF
  proposalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const finalSubmitBtn = document.getElementById("final-submit-btn");

    // --- NEW: Final validation check on submit ---
    const contactValue = document.getElementById("user-contact").value;
    if (contactValue.length < 10) {
        showMessage("Please enter a valid 10-digit contact number.", "error");
        return; // Stop the submission
    }
    // --- END OF NEW VALIDATION ---

    if (!window.jspdf) {
        console.error("jsPDF library is not loaded!");
        showMessage("PDF library is not ready. Please refresh and try again.", "error");
        return;
    }
    const { jsPDF } = window.jspdf;
    
    if (!headerImgData) {
        showMessage("Page assets are still loading. Please try again in a moment.", "error");
        return;
    }

    const formData = {
        name: document.getElementById("user-name").value,
        designation: document.getElementById("user-designation").value,
        company: document.getElementById("user-company").value,
        contact: contactValue, // Use the validated value
        email: document.getElementById("user-email").value,
        location: document.getElementById("user-location").value,
        initiatives: selectedItems,
    };
    
    finalSubmitBtn.disabled = true;
    finalSubmitBtn.textContent = 'Generating PDF...';

    // --- START OF jsPDF LOGIC ---
    try {
        const doc = new jsPDF();
        
        const imgWidth = 210;
        const imgHeight = 34.5; 
        doc.addImage(headerImgData, 'PNG', 0, 0, imgWidth, imgHeight);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(22, 53, 77); // --surface-navy
        doc.text("Corporate Initiative Proposal", 105, 50, { align: 'center' }); 
        doc.setFontSize(12);
        doc.text(`Prepared for: ${formData.company}`, 105, 57, { align: 'center' }); 

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(22, 53, 77);
        doc.text("1. Client Details", 20, 75); 
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Contact Person: ${formData.name}, ${formData.designation}`, 20, 83); 
        doc.text(`Company: ${formData.company}`, 20, 89); 
        doc.text(`Contact Email: ${formData.email}`, 20, 95); 
        doc.text(`Contact Phone: ${formData.contact}`, 20, 101);
        
        const hasCeoDinner = selectedItems.some(item => item.isCeoDinner === true);
        let tripType = "One-day trip";
        let hotel = "Not Applicable";
        if (hasCeoDinner) {
            tripType = "Overnight program";
            hotel = "Hotel Accommodation Included (TBD)";
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(22, 53, 77);
        doc.text("2. Event Overview", 20, 115);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Trip Type: ${tripType}`, 20, 123);
        doc.text(`Preferred Date: TBD (To be discussed)`, 20, 129);
        doc.text(`Event Timings: TBD (To be discussed)`, 20, 135);
        
        let yPos = 135; 
        if (hotel !== 'Not Applicable') {
            yPos += 6;
            doc.text(`Accommodation: ${hotel}`, 20, yPos);
        }

        yPos += 14;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(22, 53, 77);
        doc.text("3. Proposed Itinerary", 20, yPos);
        yPos += 8;
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("Breakfast (Included)", 25, yPos);
        yPos += 7;

        doc.setFont("helvetica", "normal");
        formData.initiatives.forEach(item => {
            if (yPos > 280) { 
                doc.addPage();
                yPos = 20; 
            }
            doc.text(item.name, 25, yPos);
            yPos += 7; 
        });
        
        if (yPos > 266) { 
            doc.addPage();
            yPos = 20;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Lunch (Included)", 25, yPos);
        yPos += 7;
        doc.text("Dinner (Included)", 25, yPos);

        doc.save('HR-Yaar-Proposal.pdf');

        showMessage("Thank you! Your proposal has been downloaded successfully.", "success");
        resetForm();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        showMessage("Sorry, there was an error generating your PDF. Please try again.", "error");
    } finally {
        finalSubmitBtn.disabled = false;
        finalSubmitBtn.textContent = 'Submit';
    }
    // --- END OF MODIFIED PDF LOGIC ---
  });

  function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
  }
  
  function resetForm() {
    selectedItems = [];
    document.querySelectorAll(".add-btn.added").forEach(btn => {
        btn.textContent = "+";
        btn.classList.remove("added");
    });
    updateSummary();
    proposalForm.reset();
    proposalForm.classList.add("hidden");
    proposalRequestBtn.classList.remove("hidden");
    // NEW: Remove invalid class on reset
    contactInput.classList.remove("input-invalid");
  }

  // Initial render of the new 6 packages
  renderPackages();
  updateSummary();
});
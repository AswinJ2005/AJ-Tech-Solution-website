document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const CONTACT_FORM_URL = "https://formspree.io/f/xgvzoeny";
    const CONSULTATION_FORM_URL = "https://formspree.io/f/mldlgwwz";

    // Configuration
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwKo3KXY6hbNF4m5pHRiKEVrpyTq_6RDszFJNwz2z5iHnwtoFdpsOoNFthmv3NppnH1/exec';

    // --- FIREBASE & GLOBAL STATE ---
    let isAdminLoggedIn = false;
    let db, auth;
    let whyChooseUsData = [], teamData = [], projectsData = [], careersData = [];

    // --- INITIALIZATION ---
    initializeLibraries();
    setupEventListeners();
    initializeFirebase();
    
    // Add window resize handler to reinitialize particles
    window.addEventListener('resize', function() {
        // Reinitialize particles on resize to ensure mobile/desktop switching works
        setTimeout(() => {
            if (typeof particlesJS !== 'undefined' && window.pJSDom && window.pJSDom.length > 0) {
                window.pJSDom[0].pJS.fn.vendors.destroypJS();
                window.pJSDom = [];
                initializeParticles();
            }
        }, 100);
    });

    // --- SETUP FUNCTIONS ---
    function initializeLibraries() {
        if (window.innerWidth > 768) {
            if (typeof VanillaTilt !== 'undefined') {
                VanillaTilt.init(document.querySelectorAll(".tilt-element"), 
                    { max: 8, speed: 400, glare: true, "max-glare": 0.2 });
            }
            setupCustomCursor();
        }
        
        // Initialize particles for all screen sizes
        setTimeout(() => {
            if (typeof particlesJS !== 'undefined') {
                initializeParticles();
            } else {
                console.log('ParticlesJS library not loaded, retrying...');
                // Retry after a short delay
                setTimeout(() => {
                    if (typeof particlesJS !== 'undefined') {
                        initializeParticles();
                    }
                }, 500);
            }
        }, 100);
        
        initializeScrollAnimations();
    }

    function initializeFirebase() {
        if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') {
            try {
                firebase.initializeApp(firebaseConfig);
                db = firebase.firestore();
                auth = firebase.auth();
                monitorAuthState();
            } catch (error) {
                console.error("Firebase initialization failed:", error);
                runSimulations();
            }
        } else {
            console.warn("Firebase config not found. Running in simulation mode.");
            runSimulations();
        }
    }

    function setupEventListeners() {
        window.addEventListener("scroll", toggleBackToTopButton);
        setupMobileMenu();
        document.querySelectorAll('.close-modal-btn').forEach(btn => btn.addEventListener('click', closeModal));
        const modalBackdrop = document.getElementById('modal-backdrop');
        if (modalBackdrop) modalBackdrop.addEventListener('click', closeModalIfClickedOutside);

        const bookBtn = document.getElementById('book-consultation-btn-nav');
        if (bookBtn) bookBtn.addEventListener('click', () => openModal('consultation-modal'));

        const contactForm = document.getElementById('contact-form');
        if (contactForm) contactForm.addEventListener('submit', handleFormspreeSubmit);

        const consultationForm = document.getElementById('consultation-form');
        if (consultationForm) consultationForm.addEventListener('submit', handleFormspreeSubmit);

        const adminBtn = document.getElementById('admin-login-logout-btn');
        if (adminBtn) {
            adminBtn.addEventListener('click', () => {
                if (isAdminLoggedIn) {
                    handleLogout();
                } else {
                    openModal('login-modal');
                }
            });
        }

        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);

        const forgotLink = document.getElementById('forgot-password-link');
        if (forgotLink) forgotLink.addEventListener('click', () => { closeModal(); openModal('forgot-password-modal'); });

        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) forgotForm.addEventListener('submit', handleForgotPassword);

        const addWhyBtn = document.getElementById('add-why-us-btn');
        if (addWhyBtn) addWhyBtn.addEventListener('click', () => openWhyUsModal(null));

        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) addMemberBtn.addEventListener('click', () => openTeamModal(null));

        const addProjectBtn = document.getElementById('add-project-btn');
        if (addProjectBtn) addProjectBtn.addEventListener('click', () => openProjectModal(null));

        document.querySelectorAll('.add-career-btn').forEach(btn => btn.addEventListener('click', () => openCareerModal(null, btn.dataset.category)));

        const whyUsForm = document.getElementById('why-us-form');
        if (whyUsForm) whyUsForm.addEventListener('submit', handleSaveWhyUs);

        const teamForm = document.getElementById('team-form');
        if (teamForm) teamForm.addEventListener('submit', handleSaveTeamMember);

        const projectForm = document.getElementById('project-form');
        if (projectForm) projectForm.addEventListener('submit', handleSaveProject);

        const careerForm = document.getElementById('career-form');
        if (careerForm) careerForm.addEventListener('submit', handleSaveCareer);

        // Add application form handler
        const applicationForm = document.getElementById('application-form');
        if (applicationForm) {
            applicationForm.addEventListener('submit', handleApplicationSubmit);
        }

        // Initialize application form when modal opens
        const applyButtons = document.querySelectorAll('.apply-now-btn');
        applyButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(initializeApplicationForm, 100);
            });
        });

        // Theme toggle functionality
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
            
            // Set initial icon based on current theme
            updateThemeIcon();
        }
    }

    // --- REALTIME DATA LOADING ---
    const loadDynamicSection = (collectionName, orderByField, renderFunction) => {
        if (!db) return;
        db.collection(collectionName).orderBy(orderByField).onSnapshot(snapshot => {
            renderFunction(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, err => console.error(`Error fetching ${collectionName}:`, err));
    };

    // --- DYNAMIC CONTENT RENDERING ---
    function renderWhyChooseUs(data) {
        whyChooseUsData = data; 
        const grid = document.getElementById('why-choose-us-grid'); 
        if (!grid) return; 
        grid.innerHTML = '';
        
        data.forEach(item => {
            const box = document.createElement('div');
            box.className = 'interactive-box tilt-element';
            box.innerHTML = `
                <div class="admin-controls reorder" style="display:${isAdminLoggedIn ? 'flex' : 'none'};">
                    <button class="reorder-btn" data-direction="-1" title="Move Up"><i class="fas fa-arrow-up"></i></button>
                    <button class="reorder-btn" data-direction="1" title="Move Down"><i class="fas fa-arrow-down"></i></button>
                </div>
                <i class="${item.icon}"></i>
                <h4>${item.title}</h4>
                <p>${item.description}</p>
                <div class="admin-controls" style="display:${isAdminLoggedIn ? 'flex' : 'none'};">
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i> Delete</button>
                </div>`;
            grid.appendChild(box);
            
            box.querySelector('.edit-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                openWhyUsModal(item); 
            });
            box.querySelector('.delete-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                handleDelete(item.id, 'reason', 'whyChooseUs'); 
            });
            box.querySelectorAll('.reorder-btn').forEach(btn => 
                btn.addEventListener('click', e => { 
                    e.stopPropagation(); 
                    handleReorder('whyChooseUs', whyChooseUsData, item.id, parseInt(btn.dataset.direction)); 
                })
            );
        });
        initializeTilt();
    }

    function renderTeam(data) {
        teamData = data; 
        const grid = document.getElementById('team-grid'); 
        if (!grid) return; 
        grid.innerHTML = '';
        
        data.forEach(member => {
            const card = document.createElement('div');
            card.className = 'interactive-box tilt-element team-card';
            
            // Fixed profile image handling with proper fallback
            const profileImage = member.profileImageUrl ? 
                `<img src="${member.profileImageUrl}" alt="${member.name}" class="team-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="team-photo-placeholder" style="display:none;"><i class="fas fa-user"></i></div>` :
                `<div class="team-photo-placeholder"><i class="fas fa-user"></i></div>`;
            
            card.innerHTML = `
                ${profileImage}
                <h4>${member.name}</h4>
                <p class="team-role">${member.role || ''}</p>
                <p class="team-bio">${member.bio || ''}</p>
                ${member.linkedinUrl ? `<a href="${member.linkedinUrl}" target="_blank" class="linkedin-link"><i class="fab fa-linkedin"></i> LinkedIn</a>` : ''}
                <div class="admin-controls" style="display:${isAdminLoggedIn ? 'flex' : 'none'};">
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                </div>`;
            grid.appendChild(card);
            
            card.querySelector('.edit-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                openTeamModal(member); 
            });
            card.querySelector('.delete-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                handleDelete(member.id, 'team member', 'team'); 
            });
        });
        initializeTilt();
        initializeImageViewer(); // Add this line after rendering team
    }

    function renderProjects(data) {
        projectsData = data; 
        const grid = document.getElementById('project-grid'); 
        if (!grid) return; 
        grid.innerHTML = '';
        
        data.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card tilt-element';
            
            // Fixed project image handling
            const projectImage = project.imageUrl ? 
                `<div class="project-image">
                    <img src="${project.imageUrl}" alt="${project.title}" onerror="this.style.display='none';">
                 </div>` : '';
            
            card.innerHTML = `
                ${projectImage}
                <div class="project-header">
                    <h4>${project.title}</h4>
                </div>
                <div class="project-body">
                    <p>${project.description}</p>
                </div>
                <div class="project-overlay">
                    <a href="#" class="case-study-button">View Project Details</a>
                </div>
                <div class="admin-controls" style="display:${isAdminLoggedIn ? 'flex' : 'none'};">
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                </div>`;
            grid.appendChild(card);
            
            card.querySelector('.edit-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                openProjectModal(project); 
            });
            card.querySelector('.delete-btn').addEventListener('click', e => { 
                e.stopPropagation(); 
                handleDelete(project.id, 'project', 'projects'); 
            });
        });
        initializeTilt();
    }

    function renderCareers(data) {
        careersData = data;
        const jobList = document.getElementById('job-listings');
        const internList = document.getElementById('internship-listings');
        if (!jobList || !internList) return;
        
        jobList.innerHTML = ''; 
        internList.innerHTML = '';
        
        data.forEach(career => {
            const container = career.category === 'Job' ? jobList : internList;
            const card = document.createElement('div');
            card.className = 'career-card';
            card.innerHTML = `
                <h4>${career.title}</h4>
                <p>${career.description}</p>
                <p><strong>Requirements:</strong> ${career.requirements}</p>
                ${career.experience ? `<p><strong>Experience:</strong> ${career.experience}</p>` : ''}
                <div class="admin-controls top-right" style="display:${isAdminLoggedIn ? 'flex' : 'none'};">
                    <button class="edit-btn"><i class="fas fa-edit"></i> Edit</button>
                    <button class="delete-btn"><i class="fas fa-trash"></i> Delete</button>
                </div>
                <button class="apply-now-btn">Apply Now</button>`;
            container.appendChild(card);
            
            card.querySelector('.apply-now-btn').addEventListener('click', () => openApplicationModal(career.title));
            card.querySelector('.edit-btn').addEventListener('click', () => openCareerModal(career));
            card.querySelector('.delete-btn').addEventListener('click', () => handleDelete(career.id, 'career posting', 'careers'));
        });
    }

    // --- MODAL & FORM LOGIC ---
    function openModal(id) { 
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) backdrop.classList.add('visible');
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        const modalToShow = document.getElementById(id);
        if(modalToShow) { 
            modalToShow.style.display = 'block'; 
            const fb = modalToShow.querySelector('.form-feedback'); 
            if (fb) fb.textContent = ''; 
        } 
    }

    function closeModal() { 
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) backdrop.classList.remove('visible'); 
    }

    function showFormFeedback(form, message, isError = false) { 
        const fb = form.querySelector('.form-feedback'); 
        if (!fb) return; 
        fb.textContent = message; 
        fb.className = `form-feedback ${isError ? 'error' : 'success'}`; 
    }

    const populateForm = (formId, data) => { 
        const form = document.getElementById(formId); 
        if (form) { 
            form.reset(); 
            for (const key in data) { 
                const el = form.querySelector(`[id="${key}"]`); 
                if (el) el.value = data[key]; 
            } 
        } 
    };

    function openWhyUsModal(data) {
        populateForm('why-us-form', data ? { 
            'why-us-id': data.id, 
            'why-us-title': data.title, 
            'why-us-icon': data.icon, 
            'why-us-description': data.description, 
            'why-us-order': data.order 
        } : { 
            'why-us-order': whyChooseUsData.length + 1 
        }); 
        document.getElementById('why-us-modal-title').innerText = data ? 'Edit Reason' : 'Add Reason'; 
        openModal('why-us-modal');
    }

    function openTeamModal(data) {
        populateForm('team-form', data ? { 
            'member-id': data.id, 
            'member-name': data.name, 
            'member-role': data.role, 
            'member-linkedin': data.linkedinUrl, 
            'member-bio': data.bio, 
            'member-photo-url': data.profileImageUrl 
        } : {}); 
        document.getElementById('team-modal-title').innerText = data ? 'Edit Team Member' : 'Add Team Member'; 
        openModal('team-modal');
    }

    function openProjectModal(data) {
        populateForm('project-form', data ? { 
            'project-id': data.id, 
            'project-title': data.title, 
            'project-image-url': data.imageUrl, 
            'project-description': data.description 
        } : {}); 
        document.getElementById('project-modal-title').innerText = data ? 'Edit Project' : 'Add Project'; 
        openModal('project-modal');
    }

    function openCareerModal(data, category) { 
        const formId = 'career-form'; 
        document.getElementById(formId).reset(); 
        document.getElementById('career-modal-title').innerText = data ? 'Edit Career Posting' : category === 'Job' ? 'Add Job Opportunity' : 'Add Internship'; 
        if (data) { 
            populateForm(formId, {
                'career-id': data.id, 
                'career-category': data.category, 
                'career-title': data.title, 
                'career-experience': data.experience, 
                'career-description': data.description, 
                'career-requirements': data.requirements 
            }); 
        } else { 
            document.getElementById('career-category').value = category; 
        } 
        openModal('career-modal'); 
    }

    function openApplicationModal(role) { 
        const form = document.getElementById('application-form'); 
        form.reset(); 
        form.querySelector('#applying-for').value = role; 
        openModal('application-modal'); 
    }

    // --- FIREBASE AUTHENTICATION ---
    function monitorAuthState() {
        if (!auth) return;
        auth.onAuthStateChanged(user => {
            isAdminLoggedIn = !!user;
            const loginBtn = document.getElementById('admin-login-logout-btn');
            if (loginBtn) {
                loginBtn.textContent = isAdminLoggedIn ? 'Logout' : 'Admin Login';
            }
            toggleAdminControls(isAdminLoggedIn);
            loadDynamicSection('whyChooseUs', 'order', renderWhyChooseUs);
            loadDynamicSection('team', 'name', renderTeam);
            loadDynamicSection('projects', 'title', renderProjects);
            loadDynamicSection('careers', 'title', renderCareers);
        });
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const form = e.target;

        firebase.auth().signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                showFormFeedback(form, 'Login successful!');
                setTimeout(() => closeModal(), 1000);
            })
            .catch((error) => {
                let errorMessage = 'Invalid username or password';
                if (error.code === 'auth/user-not-found') {
                    errorMessage = 'Account not found';
                } else if (error.code === 'auth/wrong-password') {
                    errorMessage = 'Incorrect password';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'Invalid email format';
                }
                showFormFeedback(form, errorMessage, true);
            });
    }

    function handleLogout() {
        if (auth) auth.signOut().catch(err => alert(`Logout Failed: ${err.message}`));
    }

    // FIXED: Better error handling for forgot password
    function handleForgotPassword(e) {
        e.preventDefault();
        if (!auth) return;
        
        const form = e.target;
        const email = form.querySelector('#reset-email').value;
        const adminEmail = 'info.ajtechsolutions@gmail.com'; // Admin email address
        
        // Clear previous feedback
        showFormFeedback(form, '');
        
        // First check if it's the admin email
        if (email.toLowerCase() !== adminEmail.toLowerCase()) {
            showFormFeedback(form, 'Enter a valid admin email', true);
            return;
        }
        
        // If it is admin email, proceed with password reset
        auth.sendPasswordResetEmail(email)
            .then(() => {
                showFormFeedback(form, "Password reset email sent. Check your inbox.");
            })
            .catch((err) => {
                showFormFeedback(form, "Error sending reset email. Please try again.", true);
            });
    }

    // --- DATA SAVING ---
    async function handleFormspreeSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const url = form.id === 'consultation-form' ? CONSULTATION_FORM_URL : CONTACT_FORM_URL;
        const submitBtn = form.querySelector('button[type="submit"]');
        
        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Sending...';
            }

            const response = await fetch(url, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                showFormFeedback(form, "Thank you! We'll get back to you soon.");
                form.reset();
                setTimeout(() => {
                    if (form.id === 'consultation-form') {
                        closeModal();
                    }
                }, 2000);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            showFormFeedback(form, 'Sorry, an error occurred. Please try again.', true);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = form.id === 'consultation-form' ? 'Submit Request' : 'Send Message';
            }
        }
    }

    // Button loading state helper functions
function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('btn-loading');
        button.setAttribute('original-text', button.textContent);
        button.disabled = true;
    } else {
        button.classList.remove('btn-loading');
        if (button.hasAttribute('original-text')) {
            button.textContent = button.getAttribute('original-text');
            button.removeAttribute('original-text');
        }
        button.disabled = false;
    }
}

// Update contact form handling
document.getElementById('contact-form')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);
    
    try {
        // Your existing form submission code
        // ...
        
        // After successful submission
        showFormFeedback(this, "Message sent successfully!");
    } catch (error) {
        showFormFeedback(this, "Error sending message. Please try again.", true);
        console.error("Contact form error:", error);
    } finally {
        setButtonLoading(submitButton, false);
    }
});

// Update login form handling
document.getElementById('login-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Clear any existing messages
    showFormFeedback(this, '');
    
    if (auth) {
        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                closeModal();
                showToast("Logged in successfully");
            })
            .catch((error) => {
                showFormFeedback(this, "Login failed: " + error.message, true);
            })
            .finally(() => {
                setButtonLoading(submitButton, false);
            });
    }
});

// Apply to all other form submissions
document.querySelectorAll('form').forEach(form => {
    if (!form.classList.contains('loading-handler-added')) {
        form.classList.add('loading-handler-added');
        form.addEventListener('submit', function(e) {
            if (e.target.id !== 'contact-form' && e.target.id !== 'login-form') {
                const submitButton = this.querySelector('button[type="submit"]');
                if (submitButton) {
                    setButtonLoading(submitButton, true);
                    
                    // Reset loading state after 5 seconds as fallback
                    setTimeout(() => {
                        setButtonLoading(submitButton, false);
                    }, 5000);
                }
            }
        });
    }
});

// Add loading states to apply buttons
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('apply-now-btn') || 
        e.target.id === 'book-consultation-btn-nav' || 
        e.target.id === 'admin-login-logout-btn') {
        setButtonLoading(e.target, true);
        setTimeout(() => setButtonLoading(e.target, false), 800);
    }
});

    // --- ADMIN DATA SAVE/DELETE HELPERS ---
    const Firebase = {
        async saveDocument(collection, data) {
            if (!db) throw new Error("No database connection.");
            if (data.id) {
                await db.collection(collection).doc(data.id).set(data, { merge: true });
            } else {
                await db.collection(collection).add(data);
            }
        },
        async deleteDocument(collection, id) {
            if (!db) throw new Error("No database connection.");
            await db.collection(collection).doc(id).delete();
        }
    };

    const handleSave = async (e, collection, data) => { 
        e.preventDefault(); 
        const form = e.target; 
        try { 
            await Firebase.saveDocument(collection, data); 
            showFormFeedback(form, 'Saved successfully!', false); 
            setTimeout(closeModal, 1000); 
        } catch (err) { 
            showFormFeedback(form, `Error: ${err.message}`, true); 
        } 
    };

    function handleSaveWhyUs(e) { 
        handleSave(e, 'whyChooseUs', {
            id: document.getElementById('why-us-id').value, 
            title: document.getElementById('why-us-title').value, 
            icon: document.getElementById('why-us-icon').value, 
            description: document.getElementById('why-us-description').value, 
            order: Number(document.getElementById('why-us-order').value) 
        }); 
    }

    function handleSaveTeamMember(e) { 
        handleSave(e, 'team', { 
            id: document.getElementById('member-id').value, 
            name: document.getElementById('member-name').value, 
            role: document.getElementById('member-role').value, 
            linkedinUrl: document.getElementById('member-linkedin').value, 
            bio: document.getElementById('member-bio').value, 
            profileImageUrl: document.getElementById('member-photo-url').value 
        }); 
    }

    function handleSaveProject(e) { 
        handleSave(e, 'projects', {
            id: document.getElementById('project-id').value, 
            title: document.getElementById('project-title').value, 
            imageUrl: document.getElementById('project-image-url').value, 
            description: document.getElementById('project-description').value 
        }); 
    }

    function handleSaveCareer(e) { 
        handleSave(e, 'careers', {
            id: document.getElementById('career-id').value, 
            category: document.getElementById('career-category').value, 
            title: document.getElementById('career-title').value, 
            experience: document.getElementById('career-experience').value, 
            description: document.getElementById('career-description').value, 
            requirements: document.getElementById('career-requirements').value 
        }); 
    }

    function handleDelete(id, type, coll) {
        // Prevent empty id deletion
        if (!id) {
            // Prefer toast if available, else do nothing
            if (typeof showToast === "function") {
                showToast("Delete failed: Document ID is missing.", "error");
            }
            // Optionally, you can log for debugging:
            // console.error("Delete failed: Document ID is missing.");
            return;
        }
        if (confirm(`Delete this ${type}?`)) {
            Firebase.deleteDocument(coll, id).catch(err => {
                if (typeof showToast === "function") {
                    showToast(`Error: ${err.message}`, "error");
                } else {
                    alert(`Error: ${err.message}`);
                }
            });
        }
    }

    async function handleReorder(collection, currentData, docId, direction) {
        if (!db) return;
        const docToMove = currentData.find(item => item.id === docId);
        const currentOrder = docToMove.order;
        const otherDocs = currentData.filter(item => direction > 0 ? item.order > currentOrder : item.order < currentOrder);
        if (otherDocs.length === 0) return;
        const otherDoc = otherDocs.sort((a, b) => direction > 0 ? a.order - b.order : b.order - a.order)[0];
        const batch = db.batch();
        batch.update(db.collection(collection).doc(docId), { order: otherDoc.order });
        batch.update(db.collection(collection).doc(otherDoc.id), { order: currentOrder });
        await batch.commit().catch(err => console.error("Reorder failed:", err));
    }

    // --- APPLICATION FORM HANDLING ---
    async function handleApplicationSubmit(e) {
        e.preventDefault();
        const form = e.target;
        const submitBtn = form.querySelector('button[type="submit"]');
        const fileInput = document.getElementById('resume');

        try {
            // Validate file
            if (!fileInput.files[0]) {
                showFormFeedback(form, 'Please select a resume file', true);
                return;
            }

            // File size validation (5MB limit)
            const maxSize = 5 * 1024 * 1024;
            if (fileInput.files[0].size > maxSize) {
                showFormFeedback(form, 'File size must be less than 5MB', true);
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            // Convert file to base64
            const file = fileInput.files[0];
            const reader = new FileReader();

            reader.onload = async function(e) {
                const fileData = e.target.result.split(',')[1];
                
                const formData = {
                    fullName: form.querySelector('[name="fullName"]').value,
                    email: form.querySelector('[name="email"]').value,
                    phone: form.querySelector('[name="phone"]').value,
                    applyingFor: form.querySelector('#applying-for').value,
                    motivation: form.querySelector('#motivation').value,
                    fileData: fileData,
                    fileName: file.name,
                    mimeType: file.type
                };

                try {
                    const response = await fetch(APPS_SCRIPT_URL, {
                        method: 'POST',
                        body: JSON.stringify(formData)
                    });

                    const result = await response.json();
                    
                    if (result.status === 'success') {
                        showFormFeedback(form, 'Application submitted successfully!');
                        form.reset();
                        setTimeout(closeModal, 2000);
                    } else {
                        throw new Error(result.message || 'Submission failed');
                    }
                } catch (error) {
                    throw new Error('Failed to submit application. Please try again.');
                }
            };

            reader.readAsDataURL(file);

        } catch (error) {
            console.error('Submission error:', error);
            showFormFeedback(form, `Error: ${error.message}`, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Application';
        }
    }

    // --- GENERIC HELPERS & UI ---
    function toggleAdminControls(loggedIn) {
        document.querySelectorAll('.admin-button,.admin-controls').forEach(el => {
            el.style.display = loggedIn ? 'flex' : 'none';
        });
    }

    function closeModalIfClickedOutside(e) {
        if (e.target.id === 'modal-backdrop') closeModal();
    }

    function setupMobileMenu() {
        const hamburger = document.querySelector('.hamburger');
        const navMenu = document.querySelector('.nav-menu');
        if (!hamburger || !navMenu) return;
        
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        navMenu.querySelectorAll('.nav-link, .cta-book').forEach(link =>
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            })
        );
    }

    function toggleBackToTopButton() {
        const backToTopBtn = document.getElementById("back-to-top");
        if (backToTopBtn) {
            backToTopBtn.classList.toggle("visible", window.pageYOffset > 300);
        }
    }

    function setupCustomCursor() {
        const cursorDot = document.querySelector(".cursor-dot");
        const cursorOutline = document.querySelector(".cursor-outline");
        if (!cursorDot || !cursorOutline) return;
        
        if (window.innerWidth <= 768) {
            cursorDot.style.display = 'none';
            cursorOutline.style.display = 'none';
            return;
        }
        
        window.addEventListener("mousemove", e => {
            cursorDot.style.left = `${e.clientX}px`;
            cursorDot.style.top = `${e.clientY}px`;
            cursorOutline.style.left = `${e.clientX}px`;
            cursorOutline.style.top = `${e.clientY}px`;
        });
        
        document.querySelectorAll("a,button,.tilt-element").forEach(element => {
            element.addEventListener("mouseenter", () => cursorOutline.classList.add("hovered"));
            element.addEventListener("mouseleave", () => cursorOutline.classList.remove("hovered"));
        });
    }

    function initializeTilt() {
        if (window.innerWidth > 768 && typeof VanillaTilt !== 'undefined') {
            VanillaTilt.init(document.querySelectorAll(".tilt-element"), {
                max: 8,
                speed: 400,
                glare: true,
                "max-glare": 0.2
            });
        }
    }

    function initializeScrollAnimations() {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(() => entry.target.classList.add('visible'), 
                        parseInt(entry.target.dataset.delay) || 0);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.animate-on-scroll').forEach(element => observer.observe(element));
    }

    function initializeParticles() {
        if (typeof particlesJS !== 'undefined') {
            // Mobile-optimized particle configuration
            const isMobile = window.innerWidth <= 768;
            const particleConfig = {
                particles: {
                    number: { 
                        value: isMobile ? 25 : 60, // Reduce particles on mobile for performance
                        density: { enable: true, value_area: 800 } 
                    },
                    color: { value: "#388bfd" },
                    shape: { type: "circle" },
                    opacity: { value: isMobile ? 0.4 : 0.3, random: false },
                    size: { value: isMobile ? 2.5 : 3, random: true }, // Slightly larger on mobile for visibility
                    line_linked: { 
                        enable: true, 
                        distance: isMobile ? 100 : 150, // Shorter links on mobile
                        color: "#388bfd", 
                        opacity: isMobile ? 0.3 : 0.2, // More visible on mobile
                        width: 1 
                    },
                    move: { 
                        enable: true, 
                        speed: isMobile ? 0.8 : 1, // Slightly slower on mobile
                        direction: "none", 
                        out_mode: "out" 
                    }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: { 
                        onhover: { enable: !isMobile, mode: "repulse" }, // Disable hover on mobile
                        onclick: { enable: true, mode: "push" } 
                    },
                    modes: { 
                        repulse: { distance: isMobile ? 60 : 100 }, 
                        push: { particles_nb: isMobile ? 2 : 4 } 
                    }
                },
                retina_detect: true
            };
            
            particlesJS('particles-js', particleConfig);
            
            // Debug: Check if particles are initialized
            console.log('Particles initialized for', isMobile ? 'mobile' : 'desktop');
        } else {
            console.log('ParticlesJS library not loaded');
        }
    }

    function initializeApplicationForm() {
        // This function can be used to initialize any special form handling if needed
        const fileInput = document.getElementById('resume');
        if (fileInput) {
            fileInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                const maxSize = 5 * 1024 * 1024; // 5MB
                
                if (file && file.size > maxSize) {
                    alert('File size must be less than 5MB');
                    this.value = '';
                }
            });
        }
    }

    // Theme toggling functions
    function toggleTheme() {
        const body = document.body;
        const themeToggle = document.getElementById('theme-toggle');
        
        if (body.classList.contains('light-theme')) {
            body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
        
        updateThemeIcon();
    }

    function updateThemeIcon() {
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle.querySelector('i');
        
        if (document.body.classList.contains('light-theme')) {
            icon.className = 'fas fa-moon'; // Show moon in light mode
        } else {
            icon.className = 'fas fa-sun';  // Show sun in dark mode
        }
    }

    // Load saved theme preference
    function loadSavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        
        if (savedTheme === 'light') {
            document.body.classList.add('light-theme');
        }
        
        // Update icon after theme is applied
        updateThemeIcon();
    }

    // Call this at the beginning of your initialization
    document.addEventListener('DOMContentLoaded', () => {
        // Load saved theme before other initializations
        loadSavedTheme();
        
        // ...existing code...
    });

    // --- SIMULATION FALLBACK ---
    function runSimulations() {
        if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined') return;
        console.warn("Running in simulation mode.");
        
        const whyUsData = [
            {
                id: 'w1',
                order: 1,
                icon: 'fas fa-handshake',
                title: 'Trust & Partnership',
                description: 'We believe in building long-term relationships, not just delivering products. Your success is our success.'
            },
            {
                id: 'w2',
                order: 2,
                icon: 'fas fa-brain',
                title: 'Modern Expertise',
                description: 'Leveraging the latest technologies in AI, web development, and cloud computing to give you a competitive edge.'
            },
            {
                id: 'w3',
                order: 3,
                icon: 'fas fa-rocket',
                title: 'Fast Delivery',
                description: 'We understand the importance of time-to-market. Our agile approach ensures rapid development and deployment.'
            },
            {
                id: 'w4',
                order: 4,
                icon: 'fas fa-shield-alt',
                title: '24/7 Support',
                description: 'Round-the-clock support and maintenance to ensure your systems run smoothly without interruption.'
            }
        ];

        const teamData = [
            {
                id: 't1',
                name: 'Aswin J',
                role: 'Founder & CEO',
                bio: 'Passionate technology leader with expertise in AI, web development, and cloud computing. Dedicated to helping businesses transform through innovative technology solutions.',
                profileImageUrl: 'assets/founder-photo.jpg',
                linkedinUrl: 'https://www.linkedin.com/in/aswin-j-90560b297/'
            }
        ];

        const projectData = [
            {
                id: 'p1',
                title: 'E-Commerce Platform',
                description: 'A fully responsive e-commerce platform built with React and Node.js, featuring real-time inventory management and AI-powered product recommendations.',
                imageUrl: ''
            },
            {
                id: 'p2',
                title: 'AI Chat Assistant',
                description: 'An intelligent chatbot solution using natural language processing to provide 24/7 customer support with high accuracy and user satisfaction.',
                imageUrl: ''
            },
            {
                id: 'p3',
                title: 'Cloud Migration Solution',
                description: 'Successfully migrated enterprise applications to AWS cloud infrastructure, resulting in 40% cost reduction and improved scalability.',
                imageUrl: ''
            }
        ];

        const careerData = [
            {
                id: 'c1',
                title: 'Full Stack Web Developer',
                category: 'Job',
                description: 'Join our team to build cutting-edge web applications using modern technologies.',
                requirements: 'React, Node.js, MongoDB, REST APIs, Git',
                experience: '1-3 Years'
            },
            {
                id: 'c2',
                title: 'AI/ML Engineer',
                category: 'Job',
                description: 'Work on exciting AI projects and machine learning models to solve real-world problems.',
                requirements: 'Python, TensorFlow, PyTorch, Machine Learning algorithms',
                experience: '2-4 Years'
            },
            {
                id: 'c3',
                title: 'Frontend Developer Intern',
                category: 'Internship',
                description: 'Learn and contribute to user interface development using modern frontend technologies.',
                requirements: 'HTML, CSS, JavaScript, React basics',
                experience: 'Fresher'
            },
            {
                id: 'c4',
                title: 'Cloud DevOps Intern',
                category: 'Internship',
                description: 'Gain hands-on experience with cloud platforms and DevOps practices.',
                requirements: 'Basic knowledge of AWS/Azure, Docker, Linux',
                experience: 'Fresher'
            }
        ];

        renderWhyChooseUs(whyUsData);
        renderTeam(teamData);
        renderProjects(projectData);
        renderCareers(careerData);
    }

    // --- Add this near the end of the DOMContentLoaded event function ---

    // Initialize image viewer functionality
    function initializeImageViewer() {
        // Create image viewer modal if it doesn't exist
        if (!document.querySelector('.image-viewer-modal')) {
            const imageViewer = document.createElement('div');
            imageViewer.className = 'image-viewer-modal';
            imageViewer.innerHTML = `
                <span class="close-image-viewer">&times;</span>
                <img class="modal-image" src="" alt="Enlarged Image">
            `;
            document.body.appendChild(imageViewer);
            
            // Close on click outside or on close button
            const closeBtn = imageViewer.querySelector('.close-image-viewer');
            closeBtn.addEventListener('click', () => {
                imageViewer.classList.remove('active');
            });
            
            imageViewer.addEventListener('click', (e) => {
                if (e.target === imageViewer) {
                    imageViewer.classList.remove('active');
                }
            });
        }
        
        // Add click handler to founder photo
        const founderPhoto = document.querySelector('.founder-photo');
        if (founderPhoto) {
            founderPhoto.addEventListener('click', function() {
                const imageViewer = document.querySelector('.image-viewer-modal');
                const modalImage = imageViewer.querySelector('.modal-image');
                modalImage.src = this.src;
                modalImage.alt = this.alt;
                imageViewer.classList.add('active');
            });
        }
        
        // Add click handlers to team photos
        document.querySelectorAll('.team-photo').forEach(photo => {
            photo.addEventListener('click', function() {
                const imageViewer = document.querySelector('.image-viewer-modal');
                const modalImage = imageViewer.querySelector('.modal-image');
                modalImage.src = this.src;
                modalImage.alt = this.alt;
                imageViewer.classList.add('active');
            });
        });

        // Add keyboard support (Esc to close)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelector('.image-viewer-modal')?.classList.remove('active');
            }
        });
    }

    // Also initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
        // ...existing init code...
        
        // Add image viewer initialization at the end
        initializeImageViewer();
        
        // ...existing code...
    });

}); // Close DOMContentLoaded event listener
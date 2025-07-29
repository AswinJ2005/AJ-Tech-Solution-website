// Add this simple test script to debug Firebase connections

function testFirebase() {
    console.log("Testing Firebase connection...");
    
    // Check if Firebase is initialized
    if (typeof firebase === 'undefined') {
        console.error("Firebase is not defined. Script may be missing or loading incorrectly.");
        return false;
    }
    
    try {
        // Check if app is initialized
        const app = firebase.app();
        console.log("Firebase app initialized:", app.name);
        
        // Test Firestore
        const db = firebase.firestore();
        console.log("Firestore is available");
        
        // Test authentication
        const auth = firebase.auth();
        console.log("Auth is available");
        console.log("Current user:", auth.currentUser ? 
                   `Logged in as ${auth.currentUser.email}` : 
                   "No user logged in");
        
        // Try to read from Firestore
        db.collection('whyChooseUs').limit(1).get()
            .then(snapshot => {
                if (snapshot.empty) {
                    console.log("No documents found in whyChooseUs collection");
                } else {
                    console.log("Successfully read from Firestore");
                    snapshot.forEach(doc => {
                        console.log("Sample document:", doc.id, doc.data());
                    });
                }
            })
            .catch(err => {
                console.error("Error reading from Firestore:", err);
            });
            
        return true;
    } catch (error) {
        console.error("Error testing Firebase:", error);
        return false;
    }
}

// Add to window object to call from console
window.testFirebase = testFirebase;

// Check if document is ready, if so run the test automatically
if (document.readyState === 'complete') {
    setTimeout(testFirebase, 2000); // Wait 2 seconds after page load
} else {
    window.addEventListener('load', () => {
        setTimeout(testFirebase, 2000);
    });
}

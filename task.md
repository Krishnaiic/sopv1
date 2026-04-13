

Fix the SOP upload and preview flow to improve UX and handle loading states properly:

---

### 1. Upload → Preview Flow (Popup Behavior)

Current issue:

* After submitting SOP upload, the popup closes immediately
* Then preview loads separately (slow and confusing UX)

Required fix:

* After clicking **Submit**, the popup should:

  * **Stay open**
  * Show a **loading state (spinner or progress indicator)**
* Keep showing loading **until the preview is fully ready**
* Only after preview is ready:

  * Close the popup
  * Navigate to the **Preview screen**

---

### 2. Preview Save → SOP Library Redirect

Current issue:

* After saving from preview, redirect happens without proper feedback

Required fix:

* After clicking **Save** in preview:

  * Show a **loading state**
  * Block UI interactions
* Continue loading until redirect is complete
* Then redirect to:

  ```
  /admin/sop
  ```

---

### 3. General Requirements

* No abrupt UI transitions
* No blank states during async operations
* Ensure smooth UX despite slow backend processing
* Handle API delays properly (loading, success, error states)

---

### Expected Outcome

* Users always see a **loading indicator during processing**
* No premature popup closing
* Smooth transition:

  * Upload → Preview
  * Preview Save → SOP Library

---

Avoid hacks like timeouts—tie loading strictly to API response lifecycle.

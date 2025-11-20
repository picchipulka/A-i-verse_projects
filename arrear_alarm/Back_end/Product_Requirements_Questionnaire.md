# Product Requirements Questionnaire
## A Framework for Building Your Web Application

---

## Part 1: Vision & Purpose

### Core Product Definition

**1. What is this website for?**
- [ ] Personal portfolio
- [ ] SaaS product
- [ ] Social platform
- [ ] E-commerce
- [ ] Educational platform
- [ ] Admin/Internal tool
- [ ] Other: _______________

**2. Describe your product in one sentence:**

```
[Your answer here]
```

**3. What problem does this solve for users?**

```
[Your answer here]
```

---

## Part 2: User Understanding

### Target Audience

**4. Who are your users?**
- [ ] Just you (admin)
- [ ] Public visitors (anyone)
- [ ] Registered members
- [ ] Paying customers
- [ ] Businesses/Organizations
- [ ] Multiple user types (describe below)

**5. Describe your primary user persona:**
- Age range:
- Technical skill level:
- What they want to accomplish:
- Their biggest pain point:

**6. How many users do you expect in:**
- Month 1:
- Month 6:
- Year 1:

---

## Part 3: User Journey & Features

### The User Experience

**7. Walk through a user's complete journey:**

*Example: "User lands on homepage → signs up → fills out profile → sees dashboard → saves items"*

```
Step 1: 
Step 2: 
Step 3: 
Step 4: 
Step 5: 
```

**8. What do you want users to DO on your site?**
- [ ] View content only
- [ ] Create an account
- [ ] Save/bookmark items
- [ ] Create content (posts, items, etc.)
- [ ] Interact with other users
- [ ] Make purchases
- [ ] Submit forms/applications
- [ ] Upload files
- [ ] Other: _______________

**9. What is the ONE core feature that makes this valuable?**
*This is your MVP's heart - the single most important thing*

```
[Your answer here]
```

**10. What features are "nice to have" but not essential for launch?**

```
-
-
-
```

---

## Part 4: Contact Form Requirements (MVP 2)

**11. Do you need a contact form?**
- [ ] Yes
- [ ] No
- [ ] Maybe later

**If yes:**

**12. What email should receive form submissions?**
```
[Your email here]
```

**13. What fields do you need?**
- [ ] Name
- [ ] Email
- [ ] Phone
- [ ] Subject
- [ ] Message
- [ ] Company
- [ ] Other: _______________

**14. Should users receive a confirmation email?**
- [ ] Yes
- [ ] No

**15. Any specific design requirements for the form?**
```
[Your preferences]
```

---

## Part 5: Authentication Requirements (MVP 3)

**16. Do users need to create accounts?**
- [ ] Yes
- [ ] No
- [ ] Not sure yet

**If yes:**

**17. What authentication methods do you want?**
- [ ] Email/Password
- [ ] Google Sign-In
- [ ] Facebook Login
- [ ] GitHub Login
- [ ] Phone number (SMS)
- [ ] Magic link (passwordless email)

**18. What happens after a user signs up?**
```
[Describe the flow]
```

**19. What should users be able to do once logged in that they can't do when logged out?**
```
-
-
-
```

**20. What user information do you need to collect?**
- [ ] Name
- [ ] Email (required for auth)
- [ ] Phone number
- [ ] Date of birth
- [ ] Profile photo
- [ ] Bio/Description
- [ ] Location
- [ ] Other: _______________

**21. Should users verify their email before accessing features?**
- [ ] Yes, required
- [ ] No, optional
- [ ] No verification needed

**22. Do you need different user roles?**
- [ ] Just regular users
- [ ] Users and Admins
- [ ] Multiple roles (describe below)

```
Roles needed:
-
-
```

---

## Part 6: Database & Data Requirements (MVP 4)

**23. What data do you need to store?**

*List each type of entity (thing) you need to store:*

### Entity 1: [e.g., User Profiles]
**Fields needed:**
- Field 1:
- Field 2:
- Field 3:

**Who can view this data?**
- [ ] Anyone
- [ ] Only the owner
- [ ] Only logged-in users
- [ ] Only admins

**Who can edit this data?**
- [ ] Only the owner
- [ ] Admins
- [ ] Other users (with permission)

---

### Entity 2: [e.g., Posts/Content]
**Fields needed:**
- Field 1:
- Field 2:
- Field 3:

**Who can create this?**
- [ ] Any logged-in user
- [ ] Only certain users
- [ ] Only admins

**Who can view this?**
- [ ] Anyone
- [ ] Only logged-in users
- [ ] Only the creator
- [ ] Custom privacy settings

**Who can edit/delete this?**
- [ ] Only the creator
- [ ] Admins
- [ ] Other users (specify)

---

### Entity 3: [Add more as needed]
**Fields needed:**
-

**Access rules:**
-

---

**24. What relationships exist between your data?**

*Example: "Each Post belongs to a User" or "Users can have many saved Items"*

```
-
-
-
```

**25. Do users need to search or filter data?**
- [ ] Yes
- [ ] No

**If yes, what can they search by?**
```
-
-
```

**26. Do you need real-time updates?**
*Example: Chat messages appear instantly, live notifications*

- [ ] Yes
- [ ] No
- [ ] Not sure

**27. What happens to user data if they delete their account?**
- [ ] Delete everything
- [ ] Anonymize their content (keep content, remove name)
- [ ] Keep everything
- [ ] Let users choose

---

## Part 7: Technical & Resource Information

**28. Current technical setup:**

**Do you have existing code?**
- [ ] Yes
- [ ] No

**If yes, where is it?**
```
[GitHub repo, Firebase project, etc.]
```

**Current website URL (if hosted):**
```
[URL here]
```

**29. How much time can you dedicate to this project per week?**
- [ ] 1-5 hours
- [ ] 5-10 hours
- [ ] 10-20 hours
- [ ] 20+ hours
- [ ] Varies week to week

**30. What's your technical experience level?**
- [ ] Complete beginner
- [ ] Some HTML/CSS
- [ ] Some JavaScript
- [ ] Comfortable with React
- [ ] Full-stack developer

**31. Do you have a budget for third-party services?**
- [ ] $0 (free tier only)
- [ ] Up to $25/month
- [ ] Up to $100/month
- [ ] Higher budget available
- [ ] Not sure yet

**32. What's your target launch date?**
```
[Date or timeframe]
```

---

## Part 8: Design & Branding

**33. Do you have design preferences?**
- [ ] Minimalist/Clean
- [ ] Bold/Colorful
- [ ] Professional/Corporate
- [ ] Playful/Fun
- [ ] Dark mode
- [ ] No preference - function over form

**34. Do you have branding assets?**
- [ ] Logo
- [ ] Color scheme
- [ ] Fonts
- [ ] Style guide
- [ ] None yet

**35. Are there any websites you want to emulate (style/functionality)?**
```
1.
2.
3.
```

---

## Part 9: Success Metrics

**36. How will you measure success?**

**After MVP 2 (Contact Form):**
```
Success = [e.g., "Receiving 5+ inquiries per month"]
```

**After MVP 3 (User Auth):**
```
Success = [e.g., "50 registered users"]
```

**After MVP 4 (Database):**
```
Success = [e.g., "Users creating and saving content daily"]
```

**37. What would make you consider this project a success in 6 months?**
```
[Your answer]
```

---

## Part 10: Potential Roadblocks

**38. What concerns you most about this project?**
- [ ] Technical complexity
- [ ] Time commitment
- [ ] Cost
- [ ] Not sure if people will use it
- [ ] Security/Privacy
- [ ] Scalability
- [ ] Other: _______________

**39. Have you built something like this before?**
- [ ] Yes (describe):
- [ ] No, this is my first
- [ ] Attempted but didn't finish

**40. What could make this project fail?**
```
[Your thoughts]
```

**41. What support/resources do you need most?**
- [ ] Step-by-step technical guidance
- [ ] Understanding concepts
- [ ] Code reviews
- [ ] Architecture decisions
- [ ] Debugging help
- [ ] Testing strategies
- [ ] Deployment help

---

## Part 11: Priority & Phasing

**42. Rank these by importance (1 = most important):**

___ Contact form/Email functionality
___ User accounts and login
___ Storing user data
___ Real-time features
___ Mobile responsiveness
___ Search functionality
___ Payment processing
___ Admin dashboard
___ Social features (likes, comments, sharing)
___ File uploads

**43. What MUST be in the first version (MVP)?**
```
-
-
-
```

**44. What can wait for version 2?**
```
-
-
-
```

---

## Summary Section

**Your MVP in Three Sentences:**

*After completing this questionnaire, summarize your product:*

```
1. [What it is]

2. [Who it's for and what problem it solves]

3. [The core feature that delivers value]
```

---

## Next Steps Checklist

- [ ] Complete this questionnaire
- [ ] Review and prioritize features
- [ ] Share with development team (or Claude!)
- [ ] Create technical architecture plan
- [ ] Set up development environment
- [ ] Begin MVP 2 (Contact Form)
- [ ] Test and iterate
- [ ] Move to MVP 3 (Authentication)
- [ ] Continue building!

---

## Notes & Ideas

*Use this space for any additional thoughts, questions, or ideas that come up:*

```
[Your notes]
```

---

**Document Created:** [Date]
**Last Updated:** [Date]
**Version:** 1.0

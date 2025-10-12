# Slowpost App Design

## Status bar

* Shows “Slowpost” logo  
* Login button on right, or “Profile” button if logged in

## Screens

* Home  
  * URL is [slowpost.org/](http://slowpost.org/)  
  * If not logged in  
    * Has a logo and description of the product  
    * Has a login button  
  * If logged in  
    * Shows a list of updates. An update can be someone following you, someone asking to join one of your groups, or you being accepted into a group
    * Shows a button to view your followers, with the first 5 shown as a preview
    * Shows a button to view your groups, with the first 5 shown as a preview
* Followers screen
    * Shows a list of people who have followed you, with a toggle next to each one to choose whether than person is a close friend  
    * Has a button to manually add new followers by email address
    * Shows a list of groups you are in
    * Has a button to create a new group
* Profile
  * URL is slowpost.org/username
  * Shows a person’s name, photo, and blurb
  * Lists public groups that they are part of, and private groups you are both in
  * Has a button to follow their posts
  * If it’s your profile, can edit your name, photo, blurb
  * Uploading a new profile photo supports common image formats up to 5MB and updates the photo immediately on your profile page
* Login  
  * URL is slowpast.org/p/login  
  * Asks for the user’s email address  
  * Then asks for the PIN it emailed them so the user can log in  
  * When running on localhost, allows the user to click "skip pin" to log in without having a PIN
  * On the server, only allows "skip pin" if run with an env var telling it this is allowed
  * Asks you for your user name slug and real full name the first time you sign in
  * If you try to sign in with an email that hasn't been signed in before, it asks you if you want to sign in
  * If you try to sign up with an email that /has/ been signed in before, it asks you if you want to sign up
* Group  
  * URL is slowpost.org/g/\[groupname\]  
  * Shows a list of people in that group 
  * Shows the name (and link to profile) of the group admin
  * Each person's group bio shows a short summary (editable by that person) of their role in the group.
  * Clicking on a person takes you to their profile  
  * Also has a button to ask to join the group  
  * If you are a group admin, shows people who have asked to join, with a button to decide to admit them or not
* Join Group
  * Shown if you click the "join group" button on a group
  * Asks you to enter a bio line to appear next to your profile on the group
  * Lets you provide an optional message to the group admin


## Implementation

I have the domain with cloudflare

* SQLLite as the database.
* Server written in NodeJS
* Client written in React, with NextJS
* Static files hosted with Vercel (Hobby)
* Storybook tests for every client component
* A "yarn test" command allows the storybook tests to be run as tests, confirming all pass
* Vitest tests for every server component
* Single Next.js package with integrated API routes


## Database Model

* A "profile" collection contains one document for each person, with their username, real name, and bio
* A "group" collection contains one document for each group
* A "follow" collection contains one document for each follow relationship, with a key saying whether it is a "close" follow, and indexes to look up follow relationships in both directions
* A "member" collection contains one document for each group membership, with their username, name, and per-group bio
* A "notifications" collection contains one document for each notification sent to a user. Each of these is also sent my email.
* An "auth" collection has one document for each user. This contains their email, active login PIN, and any active login sessions (with their expirey times, and secure tokens)
* Also have whatever collections you might need to manage login


## Database Adapter

* Regular server API functions don't call MongoDB directly. Instead they talk to it through a simple adapter layer.
* This adapter has the following methods:
   * getDocument(collection, key) - Gets a single object. useful for getting profile, group, "user", etc objects that there is one of
   * addDocument(collection, newKey, data) - Create a document
   * updateDocument(collection, key, update) - Updates a document
   * getChildLinks(collection, parentKey) | getParentLinks(collection, childKey) - Some collections represent one thing being part of something else. E.g. a group has members, a person has followers. In that case, we can query either all the children of a parent (e.g. the followers of a person) or the parents of a child (e.g. the people someone follows)
   * addLink(collection, parentKey, childKey, data) - Create a new link
   

## Login model

* A cookie contains username + real name + auth token + session expirey time
* An API allows you to request that it send an email (using PostMark) with a random PIN to the user's email address
* A "login" API takes an email and a valid PIN and generates a new login session, returns it as a value and sets it as a cookie
* If SKIP_PIN is set as an env variable (true when running local dev) then 
* If the user is logged in, their name appears in the to right on the top-bar. Otherwise it says "Log In | Sign Up".


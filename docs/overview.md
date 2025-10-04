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
    * Shows a list of people who have followed you, with a toggle to choose which are close friends  
    * Has a button to export the list of people as a string you can use in your email client  
* Profile  
  * URL is slowpost.org/username  
  * Shows a person’s name, photo, and blurb  
  * Lists public groups that they are part of, and private groups you are both in  
  * Has a button to follow their posts  
  * If it’s your profile, can edit your name, photo, blurb  
* Login  
  * URL is slowpast.org/p/login  
  * Asks for the user’s email address  
  * Then asks for the PIN it emailed them so the user can log in  
  * Asks you for your user name the first time you sign in  
* Group  
  * URL is slowpost.org/g/\[groupKey\]  
  * Has a non-guessable URL that is a key  
  * Shows a list of people in that group  
  * Clicking on a person takes you to their profile  
  * Also has a button to ask to join the group  
* Followers  
  * Shows a list of people who have asked to follow you  
  * You can click on them to see their profile and ask to follow them  
  * You can choose which of them to give the “close friend” post  
* 


## Implementation

I have the domain with cloudflare

* MongoDB as the database.
* Server written in NodeJS
* Client written in React, with NextJS
* Database is MongoDB, hosted with Atlas
* Static files hosted with Vercel (Hobby)
* Storybook tests for every client component
* Vitest tests for every server component
* Yarn workspaces monorepo, with client and server packages




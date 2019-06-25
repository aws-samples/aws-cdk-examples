# Amplify Console App

This an example of an Amplify Console App, triggering a build and deploy of a static site on every GitHub Repository master push.

## The Component Structure

This Stack contains:

- an Amplify Console App resource, representing the Amplify Console App that you wish to build and deploy, you need to specify its name, the URL of the GitHub Repository and the OAuth token from GitHub, which will authorize Amplify Console to access the repository and listen to commits.
- an Amplify Console Branch resource, representing the branch, to which whenever you push code it will trigger a build of your app.

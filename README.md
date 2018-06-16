# QyA
Progressive Web application that brings Q&amp;A sessions into the modern era of device connectivity.

Are you tired of the usual Q&A sessions where people are quiet and no one wants to ask anything? Tired of not being able to hear what the other people are asking because they are too far away from the Mic? Tired of not having a way to save all the questions? Tired of not knowing what questions were not asked by the audience because there was not enough time during the presentation? Then please join this project and help us build the new generation of Q&A sessions!! 
This queuing system will work using web sockets just like Kahoot does it (check it out is pretty good) this allows any type of device to easily connect to the session server. The idea is to make it as fast and easy as possible for audience to ask their questions. The questions are placed in a queue system and then fed to the speaker one by one. If time allows there will also be a smart system that will try to group questions together and a voting system to avoid audience from asking repeated questions and instead just vote for some of the existing ones. Every conference/session will have it's own set of questions and an Identifier will be used for people to join it. Whenever a question is "picked" for an answer the person that asked the question will have his device enabled in order to speak (if he has any clarifications about the question or if there is something important to add). His device (if mic enabled) will relay the voice to the main server for everyone to hear and so no need to wait for staff members to bring a microphone to him. At the end of the session the system will also output a list of all the questions and if possible all of their answers by using speech to text software. This also allows the presenter to answer all the stored questions at a later time (everyone that joined the session should be able to see the answers afterwards). Each answer can also be limited to a certain amount of minutes to make sure the presenter stays on track with the available time. The presenter will always have control over the flow of the Q&A session by using a server side panel just like how Kahoot does it.
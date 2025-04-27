import { ApplicationData } from './tratamientoBD.js';

export const userStateInit = (userStates, id) => {
    userStates[id] = {
        state: "INIT",
        data: new ApplicationData(),
        in_application: false,
        cancelAttempts: 0,
        timeout: setTimeout(() => {
            userStates[id].state = "finished";
            userStates[id].in_application = false;
            delete userStates[id].timeout;
        }, 5 * 60 * 1000),
    };
}
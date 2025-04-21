import { contentMenu } from "../utils/message.js";

export const resetUserState = (userStates, sender, message = null) => {
  clearTimeout(userStates[sender]?.timeout);
  userStates[sender].state = "INIT";
  userStates[sender].in_application = false;
  delete userStates[sender].timeout;
  delete userStates[sender].retries;
  delete userStates[sender].current_document_index;
  delete userStates[sender].documents_order;
  delete userStates[sender].current_document;
  return message ? `${message}\n\n${contentMenu}` : `${contentMenu}`;
}


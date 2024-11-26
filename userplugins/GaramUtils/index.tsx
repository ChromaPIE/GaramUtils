/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { addAccessory, removeAccessory } from "@api/MessageAccessories";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { copyWithToast } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";
import { Button, Flex, React, UserStore } from "@webpack/common";

const logger = new Logger("GaramUtils");

const settings = definePluginSettings({
    autoSendCommands: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Auto-send command instead of leaving it in chatbox",
    }
});

interface AccessoryProps {
    message: {
        applicationId: string;
        interaction?: {
            name: string;
            user: {
                id: string;
            };
        };
        embeds?: Array<{
            rawDescription: string;
        }>;
        channel_id: string;
        interactionMetadata?: {
            name: string;
            user: {
                id: string;
            };
        };
    };
}

function extractCode(rawDescription: string): string | null {
    const match = rawDescription.match(/\*\*(.*?)\*\*/);
    if (match && match[1].includes(".")) {
        return match[1];
    }
    return null;
}

const observeDomChanges = (callback: (mutations: MutationRecord[]) => void) => {
    const domMutationObserver = new MutationObserver(mutations => {
        callback(mutations);
    });
    domMutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
    return domMutationObserver;
};

const GaramButtons: React.FC<AccessoryProps> = ({ message }) => {
    if (message.applicationId !== "1061825343285112842") {
        return null;
    }

    const code = message.embeds?.[0]?.rawDescription ? extractCode(message.embeds[0].rawDescription) : null;
    if (!code) return null;

    const handleClick = (command: string) => {
        logger.info("Button clicked, command:", command);

        insertTextIntoChatInputBox(command);
        logger.info("Command inserted to chatbox");

        if (settings.store.autoSendCommands) {
            const observer = observeDomChanges(() => {
                const applicationCommand = document.querySelector("div[class^=\"applicationCommand_\"][data-slate-node=\"element\"]");
                if (applicationCommand) {
                    observer.disconnect();
                    setTimeout(() => {
                        const enter = new KeyboardEvent("keydown", {
                            key: "Enter",
                            code: "Enter",
                            which: 13,
                            keyCode: 13,
                            bubbles: true
                        });
                        const textArea = document.querySelector("[class*=\"slateTextArea\"]");
                        if (textArea) {
                            textArea.dispatchEvent(enter);
                            logger.info("Simulated Keypress on Enter");
                        } else {
                            logger.error("Error simulating Enter, chatbox not found.");
                        }
                    }, 50);
                }
            });

            // Set a timeout to disconnect the observer if the command is not recognized
            setTimeout(() => {
                observer.disconnect();
                logger.warn("Can't find any valid command in chatbox, timed out.");
            }, 2000);
        }
    };

    const handleCopyCode = () => {
        copyWithToast(code, "Code copied to clipboard!");
        logger.info("Code copied to clipboard");
    };

    const buttonStyle: React.CSSProperties = {
        minWidth: "fit-content",
        padding: "0 12px",
        flexGrow: 0,
        flexShrink: 0,
    };

    const isDropMessage = message.interaction?.name === "drop" && message.interaction?.user.id === UserStore.getCurrentUser().id;
    const isDailyMessage = message.interactionMetadata?.name === "daily" && message.interactionMetadata?.user.id === UserStore.getCurrentUser().id;

    if (isDropMessage) {
        return (
            <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.START} style={{ gap: "8px" }}>
                <Button
                    color={Button.Colors.LINK}
                    onClick={handleCopyCode}
                    style={buttonStyle}
                >
                   📝 Copy code
                </Button>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => handleClick(`/sell manual code:${code} price:1`)}
                    style={buttonStyle}
                >
                   🏷️ Price range
                </Button>
                <Button
                    color={Button.Colors.GREEN}
                    onClick={() => handleClick(`/sell auto code:${code}`)}
                    style={buttonStyle}
                >
                   💸 /sell auto
                </Button>
            </Flex>
        );
    } else if (isDailyMessage) {
        return (
            <Flex direction={Flex.Direction.HORIZONTAL} justify={Flex.Justify.START} style={{ gap: "8px" }}>
                <Button
                    color={Button.Colors.BRAND}
                    onClick={() => handleClick(`/view codes:${code}`)}
                    style={buttonStyle}
                >
                   👁 View card
                </Button>
            </Flex>
        );
    }

    return null;
};

export default definePlugin({
    name: "GaramUtils",
    description: "QoL utilities for a Photocard game app.",
    authors: [Devs.Chrom],

    settings,

    start() {
        logger.info("Hey, hey, heyyyyy!! GaramUtils enabled.");
        addAccessory("garamUtilsButtons", props => {
            if (props.message) {
                return <GaramButtons message={props.message} />;
            }
            return null;
        });
    },

    stop() {
        logger.info("GaramUtils disabled.");
        removeAccessory("garamUtilsButtons");
    }
});
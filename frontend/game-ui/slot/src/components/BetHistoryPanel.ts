import { Engine } from "game-engine";
import { isMobile } from "pixi.js";

const ITEMS_PER_PAGE = 10;
interface Amount {
  bet: number;
  win: number;
  new: number;
  multiplier?: number;
}

interface BetHistoryItem {
  id: string;
  type: string;
  amount: Amount;
  result?: string;
  isFreespin?: boolean;
  isBonusBuy?: boolean;
  createdAt: string;
  labelKey?: string;
}

/**
 * BetHistoryPanel manages the display and interactivity of the bet history UI panel.
 *
 * Features:
 * - Responsive for all devices.
 * - Shows/hides the bet history modal, loading required assets dynamically.
 * - Handles tab switching between "History" and "Top Wins" views.
 * - Populates bet history and top wins tables with data (mocked or from API).
 * - Supports pagination for history/top wins lists.
 * - Enables copy-to-clipboard for bet IDs with visual feedback.
 * - Provides replay functionality for bets.
 * - Displays detailed bet information in a separate panel.
 * - Handles closing the modal via button or clicking outside.
 */
export class BetHistoryPanel {
  public betHistoryPanel!: HTMLElement | null;
  private prevClickedCopyImg: HTMLImageElement | null = null;
  private betHistoryPageNo: number = 1;
  private apiResponse: any;
  game!: any;
  /**
   * Displays or hides the bet history panel in the UI.
   *
   * - If the panel already exists, it makes it visible, resets the tabs, populates the bet history table,
   *   and adds dynamic interactivity.
   * - If the panel does not exist, it creates a new panel element, loads the required CSS and HTML assets,
   *   displays a loading message while fetching, and then initializes the panel with the loaded content,
   *   populates the bet history table, adds interactivity, and handles pagination.
   * - Handles errors by displaying a failure message if assets cannot be loaded.
   *
   * @async
   * @returns {Promise<void>} Resolves when the panel is shown/hidden and all asynchronous operations are complete.
   */
  async showHideBetHistory() {
    if (!this.game) this.game = Engine.getEngine();

    const cssURL = "./bet-history/history-panel-style.css";
    const htmlUrl = "./bet-history/history-panel-template.html";
    const panelId = "history-panel";

    this.betHistoryPanel = document.getElementById(panelId);
    this.betHistoryPageNo = 1;
    if (this.betHistoryPanel) {
      this.betHistoryPanel.style.display = "block";
      this.checkAndResetTabs();
      await this.populateBetHistoryTable();
      this.addDynamicInteractivity();
      this.applyLocalisation();
    } else {
      const newPanel = document.createElement("div");
      newPanel.id = panelId;
      document.body.appendChild(newPanel);
      this.betHistoryPanel = newPanel;

      this.betHistoryPanel.innerHTML =
        '<div style="color:#fff;text-align:center;padding:2em;font-size:1.5em;">Loading assets...</div>';
      this.betHistoryPanel.style.display = "block";

      if (!this.betHistoryPanel.querySelector("link[data-info-css]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = cssURL;
        link.setAttribute("data-info-css", "1");
        this.betHistoryPanel.prepend(link);
      }

      fetch(htmlUrl)
        .then((res) => res?.text?.())
        .then(async (html) => {
          const linkTag = this.betHistoryPanel!.querySelector(
            "link[data-info-css]"
          );
          this.betHistoryPanel!.innerHTML = "";
          if (linkTag) this.betHistoryPanel!.appendChild(linkTag);
          this.betHistoryPanel!.innerHTML += html;
          this.betHistoryPanel!.style.display = "block";

          await this.populateBetHistoryTable();
          this.addInteractivity();
          this.handlePaginationButtons();
          this.applyLocalisation();
        })
        .catch(() => {
          this.betHistoryPanel!.innerHTML =
            '<div style="color:#fff;text-align:center;padding:2em;font-size:1.5em;">Failed to load info.</div>';
        });
    }
  }

  /**
   * Populates the bet history table in the UI with either the user's bet history or top wins data.
   *
   * This method updates the `.table-list` element within the currently visible `.tab-content` by:
   * - Displaying a loading indicator.
   * - Fetching and rendering bet history or top wins data (simulated with a timeout and mock data).
   * - Handling empty data states.
   * - Dynamically creating table rows for each entry, including copy-to-clipboard and replay functionality.
   * - Managing pagination button states.
   *
   * @param isTopWinTab - If `true`, displays top wins data; otherwise, displays the user's bet history. Defaults to `false`.
   */
  private populateBetHistoryTable(isTopWinTab: boolean = false) {
    const tableList = document.querySelector(
      ".tab-content:not(.invisible) .table-list"
    );
    if (!tableList) return;
    tableList.innerHTML = `<div class="bet-history-loading">${Engine.getEngine().locale.t(
      "game.loading"
    )}...</div>`;
    // Pagination buttons
    const prevBtn = document.querySelector(".button.prev");
    const nextBtn = document.querySelector(".button.next");
    if (nextBtn && prevBtn && isTopWinTab) { // Disable both buttons on top wins tab
      nextBtn.classList.add("disabled");
      prevBtn.classList.add("disabled");
    }

    let path = `history`;
    path = isTopWinTab ? `${path}/highest` : `${path}/${this.betHistoryPageNo}`;

    this.game.slot.ui.actor.send({
      type: isTopWinTab ? "UI_BET_TOP_WINS_HISTORY_FETCH" : "UI_BET_HISTORY_FETCH",
      path,
      onError: (error: any) => {
        this.game.slot.ui.displayErrorPopup(error);
        this.betHistoryPanel!.style.display = "none";
      },
      onDone: (data: any) => {
        this.apiResponse = data;
        tableList.innerHTML = "";

        if (!this.apiResponse?.data) {
          tableList.innerHTML = `<div class="no-data error-color">${Engine.getEngine().locale.t(
            "game.response-error"
          )}</div>`;
          return;
        }

        if (!this.apiResponse.data.length) {
          tableList.innerHTML = `<div class="no-data">${Engine.getEngine().locale.t(
            "game.no_data"
          )}</div>`;
          // remove disabled state from prev button if page no > 1
          if (prevBtn && this.betHistoryPageNo > 1 && !isTopWinTab) {
            prevBtn.classList.remove("disabled");
          }
          if (nextBtn) {
            nextBtn.classList.add("disabled");
          }
          return;
        }

        this.apiResponse.data = this.apiResponse.data.map((item: any) => ({
          ...item,
          labelKey: this.getHistoryTranslationKey(item),
        }));

        this.apiResponse?.data.forEach(
          (entry: BetHistoryItem, _index: number) => {
            const d = new Date(entry.createdAt);
            const dateTime =
              this.addPrefixToDate(d.getMonth() + 1) +
              "/" +
              this.addPrefixToDate(d.getDate()) +
              ", " +
              this.addPrefixToDate(d.getHours()) +
              ":" +
              this.addPrefixToDate(d.getMinutes());
            const div = document.createElement("div");
            div.className = "item";
            div.dataset.index = _index.toString();
            div.dataset.id = entry.id;
            div.innerHTML = `
                <div class="date">${dateTime}</div>
                <div class="id hide-sm">
                    <div class="text ellipsis">${entry.id}</div>
                    <div class="icon copy-icon-container">
                        <img src="assets/ui/history/copy.svg" alt="Copy" data-id="${
                          entry.id
                        }" class="copy-icon">
                    </div>
                </div>
                <div class="bet">${this.game.slot.currency.format(
                  entry.amount.bet
                )}</div>
                <div class="win">${this.game.slot.currency.format(
                  entry.amount.win
                )}</div>
                ${
                  isTopWinTab
                    ? `<div class="multiplier">${entry.amount.multiplier}x</div>`
                    : ""
                }
                <div class="icons hide-sm">
                    <div class="flex flex-center replay-button" data-id=${entry.id}  data-spintype=${entry.type}>
                        <span class="font-11">${Engine.getEngine().locale.t(entry.labelKey || "Spin")}</span>
                        <img src="assets/ui/history/play_icon.svg" alt="Play" class="replay-icon">
                    </div>
                </div>
            `;

            const copyIcon = div.querySelector(".copy-icon-container");
            copyIcon?.addEventListener(isMobile.any? "touchend" : "click", (e) => {
              e.stopPropagation();
              const container = e.currentTarget as HTMLElement;
              const img = container.querySelector("img");
              const text = img?.dataset.id;
              if (text) {
                if (
                  this.prevClickedCopyImg &&
                  this.prevClickedCopyImg !== img
                ) {
                  this.prevClickedCopyImg.src = "assets/ui/history/copy.svg";
                }
                this.prevClickedCopyImg = img;
                navigator.clipboard.writeText(text).then(() => {
                  // Change the image src to filled icon
                  img.src = "assets/ui/history/copy_filled.svg";
                });
              }
            });

            tableList.appendChild(div);
          }
        );

        // Pagination logic
        if (prevBtn && nextBtn) {
          if (this.apiResponse?.data.length >= ITEMS_PER_PAGE && !isTopWinTab) {
            nextBtn.classList.remove("disabled");
          } else {
            nextBtn.classList.add("disabled");
          }
          if (this.betHistoryPageNo > 1 && !isTopWinTab) {
            prevBtn.classList.remove("disabled");
          } else {
            prevBtn.classList.add("disabled");
          }
        }
      },
    });
  }

  private addPrefixToDate(dateStr: number): string {
    return dateStr.toString().length === 1 ? '0' + dateStr : dateStr.toString();
  }

  /**
   * Attaches click event listeners to the pagination buttons for navigating the bet history table.
   *
   * - The "next" button increments the current page number, repopulates the bet history table,
   *   and re-applies dynamic interactivity to the table elements.
   * - The "previous" button decrements the current page number (if greater than 1), repopulates
   *   the bet history table, and re-applies dynamic interactivity.
   */
  private handlePaginationButtons() {
    const prevBtn = document.querySelector(".button.prev");
    const nextBtn = document.querySelector(".button.next");
    if (nextBtn && prevBtn) {
      nextBtn.addEventListener(isMobile.any? "touchend" : "click", async () => {
        this.betHistoryPageNo++;
        await this.populateBetHistoryTable();
        this.addDynamicInteractivity();
      });

      prevBtn.addEventListener(isMobile.any? "touchend" : "click", async () => {
        if (this.betHistoryPageNo > 1) {
          this.betHistoryPageNo--;
        }
        await this.populateBetHistoryTable();
        this.addDynamicInteractivity();
      });
    }
  }

  /**
   * Adds interactivity to the bet history panel UI, including:
   * - Tab switching between "History" and "Top Wins" views, updating tab styles and images.
   * - Handling the display and hiding of the bet history modal via the close button.
   * - Managing navigation between the main history panel and the detail panel, including a back button.
   * - Enabling copy-to-clipboard functionality for bet IDs in the detail panel, with visual feedback.
   * - Handling the replay button in the detail panel to trigger a bet replay.
   * - Ensuring dynamic interactivity is applied after tab switches or content updates.
   */
  private addInteractivity() {
    const tabs = this.checkAndResetTabs();
    if (!tabs) return;

    const {
      historyTab,
      historyTabContent,
      topWinsTab,
      topWinsTabContent,
      topWinsTabImg,
      historyTabImg,
    } = tabs;

    const historyPanel = document.getElementById("historyPanel");
    const detailPanel = document.getElementById("historyDetailPanel");
    const backFromDetail = document.getElementById("backFromDetail");
    backFromDetail?.addEventListener(isMobile.any? "touchend" : "click", () => {
      detailPanel?.classList.add("invisible");
      historyPanel?.classList.remove("invisible");
    });

    // poopup close logic for close button
    document.getElementById("modalClose")?.addEventListener(isMobile.any? "touchend" : "click", () => {
      this.betHistoryPanel!.style.display = "none";
    });

    document.getElementById("historyOverlay")?.addEventListener(isMobile.any? "touchend" : "click", () => {
      this.betHistoryPanel!.style.display = "none";
    });

    // Tab interaction control logic
    historyTab.addEventListener(isMobile.any? "touchend" : "click", () => {
      historyTab.classList.add("active");
      historyTabContent.classList.remove("invisible");
      topWinsTab.classList.remove("active");
      topWinsTabContent.classList.add("invisible");
      historyTabImg.src = "assets/ui/history/history_icon_active.svg";
      topWinsTabImg.src = "assets/ui/history/leader_icon.svg";

      this.populateBetHistoryTable();
      this.addDynamicInteractivity();
    });
    topWinsTab.addEventListener(isMobile.any? "touchend" : "click", () => {
      topWinsTab.classList.add("active");
      topWinsTabContent.classList.remove("invisible");
      historyTab.classList.remove("active");
      historyTabContent.classList.add("invisible");

      historyTabImg.src = "assets/ui/history/history_icon.svg";
      topWinsTabImg.src = "assets/ui/history/leader_icon_active.svg";

      this.populateBetHistoryTable(true);
      this.addDynamicInteractivity();
    });

    // copy for detail panel
    document
      .querySelector("#historyDetailPanel .copy-icon-container")
      ?.addEventListener(isMobile.any? "touchend" : "click", (e) => {
        const img = (e.currentTarget as HTMLElement).querySelector("img");
        const text = img?.dataset.id;
        if (text) {
          if (this.prevClickedCopyImg && this.prevClickedCopyImg !== img) {
            this.prevClickedCopyImg.src = "assets/ui/history/copy.svg";
          }
          this.prevClickedCopyImg = img;
          navigator.clipboard.writeText(text).then(() => {
            img.src = "assets/ui/history/copy_filled.svg";
          });
        }
      });

    // open new tab for detail panel replay button
    const detailReplayBtn = document.querySelector(".detail-replay-button") as HTMLElement;
    detailReplayBtn?.addEventListener(isMobile.any? "touchend" : "click", () => {
      this.replayBet(detailReplayBtn.dataset?.id, detailReplayBtn.dataset?.spintype);
    });
    
    // open share context menu
    const detailShareBtn = document.querySelector(".detail-share-button") as HTMLElement;
    detailShareBtn?.addEventListener(isMobile.any? "touchend" : "click", () => {
      this.shareHistory(detailShareBtn.dataset?.id, detailShareBtn.dataset?.spintype);
    });

    this.addDynamicInteractivity();
  }

  /**
   * Adds dynamic interactivity to the bet history list items by attaching a click event listener
   * to the table list. Handles user interactions for replaying bets and viewing bet details.
   *
   * - If a replay button is clicked, triggers the `replayBet` method with the corresponding bet ID.
   * - If a bet item row is clicked, retrieves the relevant bet data (from either top wins or history),
   *   populates the detail panel, and toggles the visibility of the history and detail panels.
   *
   */
  private addDynamicInteractivity() {
    const historyPanel = document.getElementById("historyPanel");
    const detailPanel = document.getElementById("historyDetailPanel");
    const tableList = document.querySelector(
      ".tab-content:not(.invisible) .table-list"
    );

    if (historyPanel && detailPanel && tableList) {
      tableList.addEventListener(isMobile.any? "touchend" : "click", (e) => {
        const target = e.target as HTMLElement;

        const replayBtn = target.closest(".replay-button") as HTMLElement;
        if (replayBtn && replayBtn.dataset.id) {
          this.replayBet(replayBtn.dataset.id, replayBtn.dataset?.spintype);
        } else {
          if (isMobile.any) {
            const itemRow = target.closest(".item") as HTMLElement;
            const clickedId = itemRow.dataset.id;
            if (itemRow && clickedId) {
              const indexStr = itemRow.dataset.index;
              if (typeof indexStr === "undefined") return;
              const index = parseInt(indexStr, 10);
              const data = this.apiResponse?.data[index];
              if (data) {
                this.populateBetDetailPanel(data);
              }

              detailPanel.classList.remove("invisible");
              historyPanel.classList.add("invisible");
            }
          }
        }
      });
    }
  }

  /**
   * Opens a new browser tab to replay a bet using the provided bet ID.
   *
   * Constructs the replay URL by appending the given `id` to the `REPLAY_URL` constant,
   * then opens this URL in a new tab without sending a referrer header.
   *
   * @param id - The unique identifier of the bet to replay. If `undefined`, the function does nothing.
   */
  private replayBet(id: string | undefined, spintype: string | undefined) {
    if (!id || !spintype) {
      console.error("ID or TYPE is missing from history data")
      return;
    };
    const replayUrl = this.getReplayUrl(id, spintype);
    if(replayUrl){
      window.open(replayUrl, "_blank", "noreferrer");
    }
  }

  /**
   * Resets the state of the history and top wins tabs in the bet history panel UI.
   *
   * This method:
   * - Activates the history tab and deactivates the top wins tab.
   * - Shows the history tab content and hides the top wins tab content.
   * - Updates the tab icons to reflect the active/inactive state.
   * - Ensures the history panel is visible and the detail panel is hidden.
   * - Returns references to the manipulated DOM elements for further use.
   *
   * If any required DOM elements are missing, the method exits early.
   *
   * @returns An object containing references to the updated tab and image elements, or `undefined` if required elements are missing.
   */
  private checkAndResetTabs() {
    const historyTab = document.getElementById("historyTab");
    const topWinsTab = document.getElementById("topWinsTab");
    const historyTabContent = document.getElementById("historyTabContent");
    const topWinsTabContent = document.getElementById("topWinsTabContent");

    if (!historyTab || !topWinsTab || !historyTabContent || !topWinsTabContent)
      return;

    const historyTabImg = historyTab.querySelector("img");
    const topWinsTabImg = topWinsTab.querySelector("img");

    if (!historyTabImg || !topWinsTabImg) return;

    historyTab.classList.add("active");
    historyTabContent.classList.remove("invisible");
    topWinsTab.classList.remove("active");
    topWinsTabContent.classList.add("invisible");
    historyTabImg.src = "assets/ui/history/history_icon_active.svg";
    topWinsTabImg.src = "assets/ui/history/leader_icon.svg";

    // Reset detail panel and history panel
    const historyPanel = document.getElementById("historyPanel");
    const detailPanel = document.getElementById("historyDetailPanel");
    historyPanel?.classList.remove("invisible");
    detailPanel?.classList.add("invisible");

    return {
      historyTab,
      historyTabContent,
      topWinsTab,
      topWinsTabContent,
      historyTabImg,
      topWinsTabImg,
    };
  }

  /**
   * Populates the bet detail panel in the UI with the provided bet data.
   *
   * This method updates various elements within the detail panel, such as date, bet ID,
   * bet amount, win amount, spin type, and multiplier (if available). It also sets
   * data attributes for copy and replay actions.
   *
   * @param data - The bet data object containing details to display in the panel.
   *   - `createdAt`: The timestamp of the bet creation.
   *   - `id`: The unique identifier of the bet.
   *   - `amount`: An object containing `bet`, `win`, and optionally `multiplier`.
   *   - `type`: The type of spin or bet.
   */
  private populateBetDetailPanel(data: BetHistoryItem) {
    const detailPanel = document.getElementById("historyDetailPanel");
    if (!detailPanel) return;

    const detailDateElem = detailPanel.querySelector(".detail-date");
    if (detailDateElem)
      detailDateElem.textContent = new Date(
        data.createdAt
      ).toLocaleString();

    const detailIdElem = detailPanel.querySelector(".detail-id");
    if (detailIdElem) detailIdElem.textContent = data.id;

    const detailBetElem = detailPanel.querySelector(".detail-bet");
    if (detailBetElem)
      detailBetElem.textContent = `${this.game.slot.currency.format(
        data.amount.bet
      )}`;

    const detailWinElem = detailPanel.querySelector(".detail-win");
    if (detailWinElem)
      detailWinElem.textContent = `${this.game.slot.currency.format(
        data.amount.win
      )}`;

    const detailTypeElem = detailPanel.querySelector(".detail-spin-type");
    if (detailTypeElem) detailTypeElem.textContent = Engine.getEngine().locale.t(data.labelKey || "Spin");

    const multiplierRow = detailPanel.querySelector(
      ".detail-multiplier-container"
    ) as HTMLElement;
    const multiplierValue = detailPanel.querySelector(
      ".detail-multiplier"
    ) as HTMLElement;
    if (data.amount.multiplier !== undefined) {
      if (multiplierValue)
        multiplierValue.textContent = `${data.amount.multiplier}x`;
      if (multiplierRow) multiplierRow.classList.remove("invisible");
    } else {
      if (multiplierRow) multiplierRow.classList.add("invisible");
    }

    detailPanel.querySelector(".copy-icon")?.setAttribute("data-id", data.id);

    detailPanel.querySelector(".detail-replay-button")?.setAttribute("data-id", data.id);
    detailPanel.querySelector(".detail-replay-button")?.setAttribute("data-spintype", data.type);

    detailPanel.querySelector(".detail-share-button")?.setAttribute("data-id", data.id);
    detailPanel.querySelector(".detail-share-button")?.setAttribute("data-spintype", data.type);
  }

  private applyLocalisation() {
    const elements = document.querySelectorAll<HTMLElement>("[data-lang]");
    elements.forEach((el) => {
      const key = el.dataset.lang!;
      const translation = Engine.getEngine().locale.t(key);
      if (translation) el.innerText = translation;
    });
  }

  getHistoryTranslationKey(history: BetHistoryItem): string {
    if (history.isFreespin) return "ui.history_panel.free-bet";
    if (history.type === "bonus" && history.isBonusBuy)
      return "ui.history_panel.free-spin-buy";
    if (history.type === "bonus") return "ui.history_panel.free-spin";
    if (history.type === "ante") return "ui.history_panel.ante-bet";
    return "ui.history_panel.spin";
  }

  set visible(value: boolean) {
    if (this.betHistoryPanel) this.betHistoryPanel.style.display = "none";
  }

  shareHistory(id: string | undefined, spintype: string | undefined) {
    if (!id || !spintype) {
      console.error("ID or TYPE is missing from history data")
      return;
    };

    const url = this.getReplayUrl(id, spintype);

    const data = {
      url,
      title: `${Engine.getEngine().locale.t("ui.history_panel.share-title")}`,
      text:  `${Engine.getEngine().locale.t('ui.history_panel.share-text')}`,
    };
    navigator
      .share(data)
      .then(() => {})
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          navigator.clipboard.writeText(url);
        }
      });
  }

  getReplayUrl(id: string, spintype: string){
    const { protocol, host } = window.location;
    const baseUrl = `${protocol}//${host}/new-structure/AnubisDream/index.html`;
    return `${baseUrl}?uiMode=replay&type=${spintype}&id=${id}&gameId=${this.game.slot.server.provider.gameId}`;
  }
}

export const BetHistory = new BetHistoryPanel();

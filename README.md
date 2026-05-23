# ⚡ Neza Client for Kirka.io
**A powerful, ethical, and modular client for Kirka.io with movement techniques, Hjar (ESP), and utility features.**

---

## **✨ Features**
   Feature               | Keybind       | Description                          |
 |-----------------------|--------------|--------------------------------------|
 | **Hjar (ESP)**        | Toggle Menu  | Wallhack: See players through walls. |
 | **Slide-Hop**         | Hold W + Space | Auto-performs Slide-Hop technique. |
 | **Spring-Hop**        | Hold Space   | Auto-performs Spring-Hop technique. |
 | **Wireframe Toggle**  | **G**        | Toggle wireframe rendering.          |
 | **ESC Menu Bypass**   | Automatic    | Removes 3-second delay on ESC menu.  |
 | **Player Count**      | Automatic    | Shows player counts per region.      |
 | **Clock**            | Toggle Button| Digital clock with themes.          |
 | **Neon Crosshair**    | Toggle Menu  | Customizable crosshair.             |
 | **FPS Counter**        | Toggle Menu  | Shows your FPS.                     |

---

## **📥 Installation**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Click **"Create a new script"**.
3. Delete everything and paste this:
   ```javascript
   // ==UserScript==
   // @name         Neza Client
   // @namespace    http://tampermonkey.net/
   // @version      8.0
   // @description  Kirka.io: Movement techniques, Hjar, wireframe, ESC bypass, player count, clock.
   // @author       Fallen
   // @match        *://kirka.io/*
   // @icon         https://raw.githubusercontent.com/FallenNightA/Neza-Client/refs/heads/main/Icons.png
   // @require      https://raw.githubusercontent.com/FallenNightA/Neza-Client/main/main.js
   // @grant        none
   // @run-at       document-start
   // ==/UserScript==

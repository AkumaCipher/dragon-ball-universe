/**
 * 
 * @param {number} diceCategory The dice category 
 * @param {number} tierOfPower The tier of power used to multiply the number of dice, 1 by default.
 * @param {number} diceNumber The base number of dice to create, 1 by default.
 * @returns {string} A string representing the extra dice to add to a roll, formatted for FoundryVTT dice rolls (e.g. "2d10+1d6").
 */
export function createExtraDiceByCategory(diceCategory, tierOfPower = 1, diceNumber = 1) {
    if (diceCategory === 0) return '';

    const diceCategoryList = {
        '0': '',
        '1': 'd4',
        '2': 'd6',
        '3': 'd8',
    }

    const diceCategoryNumber = diceCategory % 4;

    const extraDiceCategory = diceCategoryList[diceCategoryNumber];

    const numberOfTens = Math.floor(diceCategory / 4);

    if (numberOfTens !== 0) var extraDiceD10 = `${numberOfTens * diceNumber * tierOfPower}d10`;

    if (extraDiceCategory !== '') var extraDiceOthers = `${diceNumber * tierOfPower}${extraDiceCategory}`;

    const extraDice = [extraDiceD10, extraDiceOthers].filter(Boolean).join('+');

    return extraDice;
}

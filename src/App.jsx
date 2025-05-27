import React, { useState, useCallback } from 'react';

// Helper: WS vs WS table to get target to-hit number (e.g., 4 for 4+)
// THIS IS YOUR UPDATED HIT CHART
const getHitTargetNumeric = (attackerWS, defenderWS) => {
    const aws = parseInt(attackerWS);
    const dws = parseInt(defenderWS);

    if (isNaN(aws) || isNaN(dws) || aws < 1 || aws > 10 || dws < 1 || dws > 10) return 7; // Invalid input

    const hitChart = [
    // Def WS:1  2  3  4  5  6  7  8  9 10 (Index 0-9)
        /*Att WS 1*/ [4, 4, 5, 5, 5, 5, 5, 5, 5, 5],
        /*Att WS 2*/ [3, 4, 4, 4, 5, 5, 5, 5, 5, 5],
        /*Att WS 3*/ [2, 3, 4, 4, 4, 5, 5, 5, 5, 5], // Note: Original Old World Chart usually doesn't go to 2+ until higher WS difference
        /*Att WS 4*/ [2, 3, 3, 4, 4, 4, 4, 4, 5, 5],
        /*Att WS 5*/ [2, 2, 3, 3, 4, 4, 4, 4, 4, 4],
        /*Att WS 6*/ [2, 2, 3, 3, 3, 4, 4, 4, 4, 4],
        /*Att WS 7*/ [2, 2, 2, 3, 3, 3, 4, 4, 4, 4],
        /*Att WS 8*/ [2, 2, 2, 3, 3, 3, 3, 4, 4, 4],
        /*Att WS 9*/ [2, 2, 2, 2, 3, 3, 3, 3, 4, 4],
        /*Att WS 10*/[2, 2, 2, 2, 3, 3, 3, 3, 3, 4],
    ];

    return hitChart[aws - 1][dws - 1];
};

// Helper: S vs T table to get target to-wound number
const getWoundTargetNumeric = (strength, toughness) => {
    const s = parseInt(strength);
    const t = parseInt(toughness);
    if (isNaN(s) || isNaN(t) || s < 1 || t < 1) return 7;
    if (s >= t + 2) return 2; if (s === t + 1) return 3; if (s === t) return 4;
    if (s === t - 1) return 5; if (s <= t - 2) return 6;
    return 7;
};

// Helper: Calculate probability of success for a D6 roll with re-rolls
const calculateProbSuccess = (targetNumeric, rerollType) => {
    if (targetNumeric <= 1) targetNumeric = 2; if (targetNumeric > 6) return 0.0;
    const probSingleSuccess = (7.0 - targetNumeric) / 6.0;
    if (rerollType === 'none') return probSingleSuccess;
    if (rerollType === 'ones') {
        return targetNumeric === 2 ? 1.0 - (1.0 / 6.0) * (1.0 / 6.0) : probSingleSuccess + (1.0 / 6.0) * probSingleSuccess;
    }
    if (rerollType === 'failed') {
        const probFailSingle = 1.0 - probSingleSuccess;
        return 1.0 - probFailSingle * probFailSingle;
    }
    return probSingleSuccess;
};

// Using your provided initialUnitStats
const initialUnitStats = {
    name: '',
    ws: 4, s: 4, t: 4, a: 1, i: 4,
    armourSave: 7, wardSave: 7, regenSave: 7,
    rerollHit: 'none', rerollWound: 'none',
    poisonedAttacks: false, armourBane: 0,
};

const UnitInput = ({ unit, setUnit, unitId }) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        // Using the more robust parseInt from my styled version to prevent NaN if field is cleared
        setUnit(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (['armourBane', 'ws', 's', 't', 'a', 'i'].includes(name) ? parseInt(value) || 0 : value),
        }));
    };
    const handleSaveChange = (e) => {
        const { name, value } = e.target;
        setUnit(prev => ({ ...prev, [name]: parseInt(value) }));
    };

    return (
        <div className="p-6 bg-white border border-slate-300 rounded-xl shadow-lg space-y-4">
            <h3 className="text-2xl font-semibold text-slate-700 mb-4 border-b pb-2 border-slate-200">{unit.name || `Unit ${unitId}`}</h3>
            
            <label className="block">
                <span className="text-slate-600 font-medium">Name:</span>
                <input type="text" name="name" value={unit.name} onChange={handleChange} placeholder={`Unit ${unitId} Name`} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2"/>
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[ {label: 'WS', name: 'ws', min:1, max:10}, {label: 'S', name: 's', min:1, max:10}, {label: 'T', name: 't', min:1, max:10}, {label: 'A', name: 'a', min:1, max:1000}, {label: 'I', name: 'i', min:1, max:10} ].map(stat => (
                    <label key={stat.name} className="block">
                        <span className="text-slate-600 font-medium">{stat.label}:</span>
                        <input type="number" name={stat.name} value={unit[stat.name]} onChange={handleChange} min={stat.min} max={stat.max} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"/>
                    </label>
                ))}
            </div>

            {[ {label: 'Armour Save', name: 'armourSave'}, {label: 'Ward Save', name: 'wardSave'}, {label: 'Regen Save', name: 'regenSave'} ].map(save => (
                <label key={save.name} className="block">
                    <span className="text-slate-600 font-medium">{save.label}:</span>
                    <select name={save.name} value={unit[save.name]} onChange={handleSaveChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50">
                        <option value={7}>None</option> <option value={2}>2+</option> <option value={3}>3+</option>
                        <option value={4}>4+</option> <option value={5}>5+</option> <option value={6}>6+</option>
                    </select>
                </label>
            ))}
            
            <label className="block">
                <span className="text-slate-600 font-medium">Re-roll To Hit:</span>
                <select name="rerollHit" value={unit.rerollHit} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50">
                    <option value="none">None</option> <option value="ones">Re-roll 1s</option> <option value="failed">Re-roll Failed</option>
                </select>
            </label>

            <label className="block">
                <span className="text-slate-600 font-medium">Re-roll To Wound:</span>
                <select name="rerollWound" value={unit.rerollWound} onChange={handleChange} className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50">
                    <option value="none">None</option> <option value="ones">Re-roll 1s</option> <option value="failed">Re-roll Failed</option>
                </select>
            </label>
            
            <div className="flex items-center space-x-2 mt-2">
                <input id={`poison-${unitId}`} type="checkbox" name="poisonedAttacks" checked={unit.poisonedAttacks} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-indigo-600 shadow-sm focus:ring-indigo-500"/>
                <label htmlFor={`poison-${unitId}`} className="text-slate-600 font-medium">Poisoned Attacks</label>
            </div>

            <label className="block">
                <span className="text-slate-600 font-medium">Armour Bane:</span>
                <input type="number" name="armourBane" value={unit.armourBane} onChange={handleChange} min="0" max="5" className="mt-1 block w-full rounded-md border-slate-300 shadow-sm p-2 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"/>
            </label>
        </div>
    );
};

const App = () => {
    // Using your preferred default unit names
    const [unit1, setUnit1] = useState({...initialUnitStats, name: "Unit 1"});
    const [unit2, setUnit2] = useState({...initialUnitStats, name: "Unit 2"});
    const [results, setResults] = useState(null);

    const calculateCombat = useCallback(() => {
        const calculateExpectedWounds = (attacker, defender) => {
            const targetHitNumeric = getHitTargetNumeric(attacker.ws, defender.ws);
            const probHitTotal = calculateProbSuccess(targetHitNumeric, attacker.rerollHit);
            if (probHitTotal === 0) return 0;

            let probHitIsNatural6 = 0;
            if (attacker.poisonedAttacks) {
                const P_nat_6_first_roll = (targetHitNumeric <= 6 && targetHitNumeric > 0) ? 1.0 / 6.0 : 0;
                if (attacker.rerollHit === 'none' || (attacker.rerollHit === 'ones' && targetHitNumeric !== 2)) {
                    probHitIsNatural6 = P_nat_6_first_roll;
                } else if (attacker.rerollHit === 'ones' && targetHitNumeric === 2) {
                     probHitIsNatural6 = (1.0/6.0) + (1.0/6.0) * (1.0/6.0); 
                } else if (attacker.rerollHit === 'failed') {
                    let probFailFirstRoll = (targetHitNumeric > 6) ? 1.0 : ((targetHitNumeric <= 1) ? 0.0 : (targetHitNumeric - 1.0) / 6.0);
                    probHitIsNatural6 = P_nat_6_first_roll + probFailFirstRoll * (1.0 / 6.0);
                }
            }
            
            const targetWoundNumeric = getWoundTargetNumeric(attacker.s, defender.t);
            const probWoundNormal = calculateProbSuccess(targetWoundNumeric, attacker.rerollWound);
            let probWoundGivenHit;
            if (attacker.poisonedAttacks && probHitTotal > 0) { // Ensure probHitTotal > 0 for division
                const probSuccessfulHitWasNat6 = probHitIsNatural6 / probHitTotal;
                const probSuccessfulHitNotNat6 = 1.0 - probSuccessfulHitWasNat6;
                probWoundGivenHit = (probSuccessfulHitWasNat6 * 1.0) + (probSuccessfulHitNotNat6 * probWoundNormal);
            } else {
                probWoundGivenHit = probWoundNormal;
            }
             // Corrected logic for when targetWoundNumeric > 6
            if (targetWoundNumeric > 6 && !(attacker.poisonedAttacks && probHitIsNatural6 > 0)) {
                 probWoundGivenHit = 0;
            }
            if (probWoundGivenHit < 0) probWoundGivenHit = 0;


            let probFailArmour = 1.0;
            if (defender.armourSave >= 2 && defender.armourSave <= 6) {
                const armourModFromStrength = (attacker.s >= 4) ? (attacker.s - 3) : 0;
                const effectiveASTarget = defender.armourSave + armourModFromStrength + attacker.armourBane;
                let probPassArmour = 0;
                if (effectiveASTarget <= 1) probPassArmour = 1.0;
                else if (effectiveASTarget <= 6) probPassArmour = (7.0 - effectiveASTarget) / 6.0;
                probFailArmour = 1.0 - Math.max(0, Math.min(1, probPassArmour));
            }

            let probFailWard = 1.0;
            if (defender.wardSave >= 2 && defender.wardSave <= 6) {
                probFailWard = 1.0 - Math.max(0, Math.min(1, (7.0 - defender.wardSave) / 6.0));
            }

            let probFailRegen = 1.0;
            if (defender.regenSave >= 2 && defender.regenSave <= 6) {
                probFailRegen = 1.0 - Math.max(0, Math.min(1, (7.0 - defender.regenSave) / 6.0));
            }
            
            const expectedWoundsVal = attacker.a * probHitTotal * probWoundGivenHit * probFailArmour * probFailWard * probFailRegen;
            return Math.max(0, expectedWoundsVal);
        };

        const woundsU1toU2 = calculateExpectedWounds(unit1, unit2);
        const woundsU2toU1 = calculateExpectedWounds(unit2, unit1);
        setResults({ u1ToU2, u2ToU1, combatResU1: woundsU1toU2 - woundsU2toU1 });
    }, [unit1, unit2]);

    return (
        <div className="min-h-screen bg-slate-100 py-8 px-4 font-sans">
            <div className="container mx-auto max-w-5xl">
                <header className="text-center mb-10">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-800">Warhammer: The Old World</h1>
                    <h2 className="text-3xl sm:text-4xl font-semibold text-indigo-700 mt-1">Combat Simulator</h2>
                    <p className="text-md text-slate-600 mt-3">Calculate expected combat outcomes based on unit statistics.</p>
                </header>

                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <UnitInput unit={unit1} setUnit={setUnit1} unitId="1" />
                    <UnitInput unit={unit2} setUnit={setUnit2} unitId="2" />
                </div>

                <div className="text-center mb-10">
                    <button 
                        onClick={calculateCombat}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 text-lg"
                    >
                        Calculate Combat Results
                    </button>
                </div>

                {results && (
                    <div className="bg-white p-6 rounded-xl shadow-2xl border border-slate-200">
                        <h2 className="text-3xl font-semibold text-slate-700 mb-6 text-center border-b pb-3 border-slate-200">Expected Results</h2>
                        <div className="grid md:grid-cols-3 gap-6 text-center">
                            <div className="p-4 bg-sky-50 rounded-lg border border-sky-200 shadow">
                                <h3 className="font-semibold text-sky-700 text-lg">{unit1.name || "Unit 1"} inflicts on {unit2.name || "Unit 2"}:</h3>
                                <p className="text-3xl font-bold text-sky-800 mt-1">{results.u1ToU2.toFixed(3)} wounds</p>
                            </div>
                            <div className="p-4 bg-rose-50 rounded-lg border border-rose-200 shadow">
                                <h3 className="font-semibold text-rose-700 text-lg">{unit2.name || "Unit 2"} inflicts on {unit1.name || "Unit 1"}:</h3>
                                <p className="text-3xl font-bold text-rose-800 mt-1">{results.u2ToU1.toFixed(3)} wounds</p>
                            </div>
                            <div className={`p-4 rounded-lg border shadow ${results.combatResU1 >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                <h3 className={`font-semibold text-lg ${results.combatResU1 >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                                    Combat Resolution (for {unit1.name || "Unit 1"}):
                                </h3>
                                <p className={`text-3xl font-bold mt-1 ${results.combatResU1 >= 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
                                    {results.combatResU1.toFixed(3)}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">(Positive means {unit1.name || "Unit 1"} wins combat)</p>
                            </div>
                        </div>
                    </div>
                )}
                <footer className="text-center mt-12 py-6 border-t border-slate-300">
                    <p className="text-sm text-slate-500">Warhammer: The Old World is &copy; Games Workshop Limited. This is an unofficial fan-made tool.</p>
                </footer>
            </div>
        </div>
    );
};

export default App;
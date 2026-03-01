'use client';

import { useMemo, useState } from 'react';
import {
    FiAlertTriangle,
    FiCalendar,
    FiCheckCircle,
    FiDownload,
    FiMapPin,
    FiUser,
    FiX,
    FiXCircle,
} from 'react-icons/fi';
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

const STATIC_ROWS = [
    {
        camion: 'TN-125-485',
        chauffeur: 'Ahmed Ben Ali',
        type: 'Cargo',
        objectif: 20,
        gpsL: 1858,
        consoGps: 18.2,
        consoDelta: -1.8,
        ravitL: 147,
        facturesCount: 3,
        montantDt: 206,
        ecartL: -1711,
        ecartPct: -92.1,
        statut: 'conforme',
    },
    {
        camion: 'TN-248-112',
        chauffeur: 'Mohamed Trabelsi',
        type: 'Semi',
        objectif: 16,
        gpsL: 3446,
        consoGps: 15.1,
        consoDelta: -0.9,
        ravitL: 391,
        facturesCount: 3,
        montantDt: 547,
        ecartL: -3055,
        ecartPct: -88.7,
        statut: 'conforme',
    },
    {
        camion: 'TN-362-890',
        chauffeur: 'Khaled Mansouri',
        type: 'Frigo',
        objectif: 30,
        gpsL: 2222,
        consoGps: 28.5,
        consoDelta: -1.5,
        ravitL: 249,
        facturesCount: 3,
        montantDt: 349,
        ecartL: -1973,
        ecartPct: -88.8,
        statut: 'conforme',
    },
    {
        camion: 'TN-415-007',
        chauffeur: 'Sami Jebali',
        type: 'Cargo',
        objectif: 20,
        gpsL: 1989,
        consoGps: 21.8,
        consoDelta: 1.8,
        ravitL: 217,
        facturesCount: 3,
        montantDt: 304,
        ecartL: -1772,
        ecartPct: -89.1,
        statut: 'avertissement',
    },
    {
        camion: 'TN-521-334',
        chauffeur: 'Riadh Gharbi',
        type: 'Semi',
        objectif: 16,
        gpsL: 3442,
        consoGps: 16.9,
        consoDelta: 0.9,
        ravitL: 286,
        facturesCount: 3,
        montantDt: 400,
        ecartL: -3156,
        ecartPct: -91.7,
        statut: 'avertissement',
    },
    {
        camion: 'TN-931-751',
        chauffeur: 'Yassine Farhat',
        type: 'Frigo',
        objectif: 30,
        gpsL: 2090,
        consoGps: 31.2,
        consoDelta: 1.2,
        ravitL: 207,
        facturesCount: 3,
        montantDt: 322,
        ecartL: -1883,
        ecartPct: -90.1,
        statut: 'depassement',
    },
];

const SERIES = [
    { h: '00:00', niveau: 64, ravit: 62, critique: 20 },
    { h: '01:00', niveau: 64, ravit: 62, critique: 20 },
    { h: '02:00', niveau: 64, ravit: 61, critique: 20 },
    { h: '03:00', niveau: 64, ravit: 61, critique: 20 },
    { h: '04:00', niveau: 64, ravit: 60, critique: 20 },
    { h: '05:00', niveau: 64, ravit: 60, critique: 20 },
    { h: '06:00', niveau: 63, ravit: 59, critique: 20 },
    { h: '07:00', niveau: 61, ravit: 58, critique: 20 },
    { h: '08:00', niveau: 60, ravit: 58, critique: 20 },
    { h: '09:00', niveau: 59, ravit: 57, critique: 20 },
    { h: '10:00', niveau: 57, ravit: 56, critique: 20 },
    { h: '11:00', niveau: 57, ravit: 55, critique: 20 },
    { h: '12:00', niveau: 54, ravit: 54, critique: 20 },
    { h: '13:00', niveau: 52, ravit: 53, critique: 20 },
    { h: '14:00', niveau: 51, ravit: 52, critique: 20 },
    { h: '15:00', niveau: 50, ravit: 51, critique: 20 },
    { h: '16:00', niveau: 49, ravit: 50, critique: 20 },
    { h: '17:00', niveau: 46, ravit: 49, critique: 20 },
    { h: '18:00', niveau: 45, ravit: 48, critique: 20 },
    { h: '19:00', niveau: 44, ravit: 47, critique: 20 },
    { h: '20:00', niveau: 42, ravit: 46, critique: 20 },
    { h: '21:00', niveau: 42, ravit: 46, critique: 20 },
    { h: '22:00', niveau: 42, ravit: 45, critique: 20 },
];

const typePill = {
    Cargo: 'bg-blue-50 text-blue-600',
    Semi: 'bg-emerald-50 text-emerald-700',
    Frigo: 'bg-violet-50 text-violet-600',
};

const statusPill = {
    conforme: 'bg-emerald-100 text-emerald-700',
    avertissement: 'bg-amber-100 text-amber-700',
    depassement: 'bg-red-100 text-red-700',
};

const statusRow = {
    conforme: '#f6fffa',
    avertissement: '#fffaf2',
    depassement: '#fff5f5',
};

const statusLabel = {
    conforme: 'Conforme',
    avertissement: 'Avertissement',
    depassement: 'Dépassement',
};

export default function CarburantPage() {
    const [dateMode, setDateMode] = useState('jour');
    const [matricule, setMatricule] = useState('');
    const [chauffeur, setChauffeur] = useState('all');
    const [type, setType] = useState('all');
    const [statut, setStatut] = useState('all');
    const [selectedRow, setSelectedRow] = useState(null);

    const filteredRows = useMemo(() => {
        return STATIC_ROWS.filter((item) => {
            const m = matricule.trim().toLowerCase();
            const matchMat = m ? item.camion.toLowerCase().includes(m) : true;
            const matchCh = chauffeur === 'all' ? true : item.chauffeur === chauffeur;
            const matchType = type === 'all' ? true : item.type === type;
            const matchStatus = statut === 'all' ? true : item.statut === statut;
            return matchMat && matchCh && matchType && matchStatus;
        });
    }, [matricule, chauffeur, type, statut]);

    const headerDate = '15/01/2025';

    return (
        <div className="p-4 md:p-5 bg-[#f4f7fb] min-h-screen">
            <div className="bg-white rounded-2xl border border-slate-100 p-3 mb-4 flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {['jour', 'plage', 'semaine', 'mois'].map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setDateMode(mode)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${dateMode === mode ? 'bg-white text-orange-500 shadow-sm' : 'text-slate-600'}`}
                        >
                            {mode[0].toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>

                <input
                    type="text"
                    value={headerDate}
                    readOnly
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs w-[140px]"
                />

                <input
                    type="text"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value)}
                    placeholder="Matricule..."
                    className="px-3 py-2 border border-slate-200 rounded-xl text-xs w-[170px]"
                />

                <select value={chauffeur} onChange={(e) => setChauffeur(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">
                    <option value="all">Tous chauffeurs</option>
                    {[...new Set(STATIC_ROWS.map((x) => x.chauffeur))].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">
                    <option value="all">Tous types</option>
                    <option value="Cargo">Cargo</option>
                    <option value="Semi">Semi</option>
                    <option value="Frigo">Frigo</option>
                </select>

                <select value={statut} onChange={(e) => setStatut(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">
                    <option value="all">Tous statuts</option>
                    <option value="conforme">Conforme</option>
                    <option value="avertissement">Avertissement</option>
                    <option value="depassement">Dépassement</option>
                </select>

                <button className="ml-auto px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 inline-flex items-center gap-2">
                    <FiDownload /> Export
                </button>
            </div>

            <div className="mb-3">
                <h2 className="text-2xl font-black text-slate-900">Analyse comparative carburant — Flotte complète</h2>
                <p className="text-xs text-slate-400">GPS vs Ravitaillement · Cliquez sur une ligne pour voir la courbe de niveau</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                <div className="grid grid-cols-12 text-white text-center text-base font-bold">
                    <div className="col-span-3 bg-[#141a3c] py-2">IDENTIFICATION</div>
                    <div className="col-span-2 bg-[#2f62d9] py-2">DONNÉES GPS</div>
                    <div className="col-span-3 bg-[#10956b] py-2">RAVITAILLEMENT (FACTURES)</div>
                    <div className="col-span-4 bg-[#d81f26] py-2">ANALYSE ÉCARTS</div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1180px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-left text-sm text-slate-700">
                                <th className="px-3 py-2.5">Matricule</th>
                                <th className="px-3 py-2.5">Type</th>
                                <th className="px-3 py-2.5">GPS (L)</th>
                                <th className="px-3 py-2.5">Conso. GPS (L/100km)</th>
                                <th className="px-3 py-2.5">Ravit. (L)</th>
                                <th className="px-3 py-2.5">Factures</th>
                                <th className="px-3 py-2.5">Écart (L)</th>
                                <th className="px-3 py-2.5">Écart (%)</th>
                                <th className="px-3 py-2.5">Statut Objectif</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row) => (
                                <tr
                                    key={row.camion}
                                    onClick={() => setSelectedRow(row)}
                                    className="cursor-pointer border-b border-slate-100 hover:brightness-95"
                                    style={{ background: statusRow[row.statut] }}
                                >
                                    <td className="px-3 py-3 align-top">
                                        <div className="font-black text-xl text-slate-800">{row.camion}</div>
                                        <div className="text-xs text-slate-400">{row.chauffeur}</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${typePill[row.type]}`}>{row.type}</span>
                                        <div className="text-xs text-slate-400 mt-1">Obj: {row.objectif} L/100km</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className="text-3xl font-black text-slate-800">{row.gpsL}</div>
                                        <div className="text-xs text-slate-400">GPS</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className={`text-3xl font-black ${row.consoDelta <= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{row.consoGps}</div>
                                        <div className="text-xs text-slate-400">{row.consoDelta <= 0 ? '↓' : '↑'} {Math.abs(row.consoDelta)} vs obj.</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className="text-3xl font-black text-slate-800">{row.ravitL}</div>
                                        <div className="text-xs text-slate-400">Ravit.</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className="text-xl font-black text-blue-600">{row.facturesCount} factures</div>
                                        <div className="text-lg text-slate-500">{row.montantDt} DT</div>
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <div className={`text-3xl font-black ${row.statut === 'conforme' ? 'text-emerald-600' : row.statut === 'avertissement' ? 'text-amber-600' : 'text-red-600'}`}>{row.ecartL} L</div>
                                        <div className={`h-2 mt-2 rounded-full ${row.statut === 'conforme' ? 'bg-emerald-500' : row.statut === 'avertissement' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                    </td>
                                    <td className={`px-3 py-3 align-top text-3xl font-black ${row.statut === 'conforme' ? 'text-emerald-600' : row.statut === 'avertissement' ? 'text-amber-600' : 'text-red-600'}`}>
                                        {row.ecartPct}%
                                    </td>
                                    <td className="px-3 py-3 align-top">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusPill[row.statut]}`}>
                                            {row.statut === 'conforme' ? <FiCheckCircle /> : row.statut === 'avertissement' ? <FiAlertTriangle /> : <FiXCircle />}
                                            {statusLabel[row.statut]}
                                        </span>
                                        <div className="text-xs text-slate-400 mt-1">{row.consoGps} / {row.objectif} L/100km</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRow && (
                <div className="fixed inset-0 z-[2200] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center">
                    <div className="w-full max-w-[1200px] bg-white rounded-2xl border border-slate-100 overflow-hidden max-h-[92vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Niveau carburant — {selectedRow.camion}</h3>
                                <p className="text-slate-400 text-sm">{selectedRow.chauffeur} · {selectedRow.type} · Objectif: {selectedRow.objectif} L/100km</p>
                            </div>
                            <button onClick={() => setSelectedRow(null)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                                <FiX className="text-2xl" />
                            </button>
                        </div>

                        <div className="grid md:grid-cols-4 border-b border-slate-100">
                            <div className="p-6 border-r border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Total consommé</p>
                                <p className="text-5xl font-black text-slate-800 leading-none mt-2">{selectedRow.gpsL}</p>
                                <p className="text-slate-300 text-sm">litres / mois</p>
                            </div>
                            <div className="p-6 border-r border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Consomm. moy.</p>
                                <p className="text-5xl font-black text-slate-800 leading-none mt-2">{selectedRow.consoGps}</p>
                                <p className="text-slate-300 text-sm">L/100km</p>
                            </div>
                            <div className="p-6 border-r border-slate-100">
                                <p className="text-xs font-bold text-slate-400 uppercase">Nb pleins</p>
                                <p className="text-5xl font-black text-slate-800 leading-none mt-2">{selectedRow.facturesCount}</p>
                                <p className="text-slate-300 text-sm">ce mois</p>
                            </div>
                            <div className="p-6">
                                <span className="inline-block px-3 py-1 rounded-lg text-white bg-blue-500 text-sm font-bold uppercase">Coût total</span>
                                <p className="text-5xl font-black text-slate-800 leading-none mt-2">{selectedRow.montantDt}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-slate-300 text-sm">DT ce mois</p>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${statusPill[selectedRow.statut]}`}>
                                        <FiCheckCircle /> {statusLabel[selectedRow.statut]}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3">
                            <div className="lg:col-span-2 border-r border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-xl font-black text-slate-700">Niveau réservoir — Journée du {headerDate}</h4>
                                    <div className="flex items-center gap-4 text-slate-400 text-sm font-semibold">
                                        <span className="inline-flex items-center gap-1"><span className="w-5 h-1 bg-orange-500 rounded" /> Niveau</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full" /> Ravitaillement</span>
                                        <span className="inline-flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full" /> Critique</span>
                                    </div>
                                </div>
                                    <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={SERIES} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                                            <XAxis dataKey="h" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 105]} tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip formatter={(value) => `${value}%`} />
                                            <Line type="monotone" dataKey="niveau" stroke="#f97316" strokeWidth={3} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="critique" stroke="#fca5a5" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-3 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">📍 Cliquez sur un point de la courbe pour voir la position du camion sur la carte →</div>
                            </div>

                            <div className="p-6">
                                <h4 className="text-xl font-black text-slate-700 mb-3 inline-flex items-center gap-2"><FiMapPin className="text-pink-500" /> Position GPS</h4>
                                <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 h-[220px] p-4 flex flex-col justify-between">
                                    <div className="bg-white/90 border border-slate-200 rounded-2xl p-3 shadow-sm w-fit">
                                        <p className="font-black text-slate-700 text-lg">{selectedRow.camion}</p>
                                        <p className="text-slate-500 text-sm">📍 Position actuelle</p>
                                    </div>
                                    <p className="text-slate-400 text-sm">Carte statique (frontend mock)</p>
                                </div>

                                <div className="mt-4 rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-700 inline-flex items-center gap-2"><FiUser /> Affectations chauffeurs</p>
                                        <span className="text-xs px-3 py-1 rounded-full bg-orange-50 text-orange-500 font-bold">0 affectation · 0 chauffeur</span>
                                    </div>
                                    <div className="p-6 text-center text-slate-300 text-sm">Aucune affectation sur cette période</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

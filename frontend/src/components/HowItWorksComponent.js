import React, { useState } from 'react';
import { ArrowLeft, Award, Users, Star, Repeat, Zap, Clock, ChevronDown, ChevronUp, Check, Sparkles, Crown, Handshake, Anchor, Swords, Bomb, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const AccordionItem = ({ title, icon, isOpen, toggleAccordion, children }) => {
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg mb-4 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-900 text-left"
        onClick={toggleAccordion}
      >
        <div className="flex items-center">
          {icon}
          <h2 className="text-xl font-bold ml-2">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronUp className="text-neutral-500 dark:text-neutral-400" size={20} />
        ) : (
          <ChevronDown className="text-neutral-500 dark:text-neutral-400" size={20} />
        )}
      </button>
      {isOpen && (
        <div className="p-5 bg-white dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700">
          {children}
        </div>
      )}
    </div>
  );
};

const HowItWorksComponent = () => {
  const [openSection, setOpenSection] = useState('draft');

  const toggleAccordion = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white rounded-lg shadow mb-4">
      <div className="mb-8">
        <nav className="flex items-center mb-4">
          <Link to="/" className="flex items-center text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 transition-colors">
            <ArrowLeft size={20} className="mr-1" />
            Back to Dashboard
          </Link>
        </nav>
        <h1 className="text-3xl font-bold">How Pitch Perfect Works</h1>
      </div>

      {/* Pre-Season Draft Section */}
        <AccordionItem 
        title="Pre-Season Draft" 
        icon={<Users className="text-blue-500 dark:text-blue-400" size={24} />}
        isOpen={openSection === 'draft'}
        toggleAccordion={() => toggleAccordion('draft')}
        >
        <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-2">Draft Order and Snake Draft Format</h3>
            
            <p className="mb-4">
            Pitch Perfect uses a <span className="font-semibold">Snake Draft</span> format to ensure fair player distribution. 
            This means the draft order reverses in each round.
            </p>
            
            <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <thead>
                <tr>
                    <th className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-left w-1/4">Round</th>
                    <th className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-left w-3/4">Draft Order</th>
                </tr>
                </thead>
                <tbody>
                <tr>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700 font-medium">Round 1</td>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center flex-wrap gap-1">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 1</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 2</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 3</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">...</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 10</span>
                    </div>
                    </td>
                </tr>
                <tr>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700 font-medium">Round 2</td>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center flex-wrap gap-1">
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">User 10</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">User 9</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">User 8</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">...</span>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">User 1</span>
                    </div>
                    </td>
                </tr>
                <tr>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700 font-medium">Round 3</td>
                    <td className="py-3 px-4 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center flex-wrap gap-1">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 1</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 2</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 3</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">...</span>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">User 10</span>
                    </div>
                    </td>
                </tr>
                </tbody>
            </table>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
                <h4 className="font-semibold mb-2 flex items-center">
                <Clock size={18} className="text-blue-500 dark:text-blue-400 mr-2" />
                Draft Timing
                </h4>
                <p className="text-sm">
                The draft begins approximately one week before the season starts. Players can rank their preferences 
                until one day before the season begins, giving everyone time to review their squads and set their boosts for Week 1.
                </p>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow border border-neutral-200 dark:border-neutral-700">
                <h4 className="font-semibold mb-2 flex items-center">
                <Star size={18} className="text-yellow-500 dark:text-yellow-400 mr-2" />
                Player Ranking
                </h4>
                <p className="text-sm">
                Before the draft, you'll rank players based on your preferences. The system provides a default ranking 
                using historical data (average points over the past 4 seasons), but you can fully customize your rankings.
                </p>
            </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 flex items-center text-blue-700 dark:text-blue-300">
                Pro Tip:
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
                Focus on ranking the top 30-40 players according to your strategy. Lower-ranked players are less likely to impact your draft significantly, 
                though you can still customize the entire list if you prefer.
            </p>
            </div>
        </div>
        </AccordionItem>

      {/* Point Scoring Section */}
        <AccordionItem 
        title="Point Scoring System" 
        icon={<Award className="text-green-500 dark:text-green-400" size={24} />}
        isOpen={openSection === 'scoring'}
        toggleAccordion={() => toggleAccordion('scoring')}
        >
        {/* Batting Points - Full width */}
        <div className="p-5 bg-white dark:bg-neutral-800 border-l-4 border-blue-500 dark:border-blue-400 mb-6">
            <h3 className="text-xl font-semibold mb-4 text-blue-700 dark:text-blue-300 font-caption">Batting</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Batting Points */}
            <div>
                <table className="w-full">
                <tbody>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Run</td>
                    <td className="py-2 text-right font-bold">1 pt</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Four</td>
                    <td className="py-2 text-right font-bold">1 pt</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Six</td>
                    <td className="py-2 text-right font-bold">2 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">50+ Runs</td>
                    <td className="py-2 text-right font-bold">8 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">100+ Runs</td>
                    <td className="py-2 text-right font-bold">16 pts</td>
                    </tr>
                    <tr>
                    <td className="py-2 text-red-600 dark:text-red-400">Duck (BAT/ALL/WK)</td>
                    <td className="py-2 text-right font-bold text-red-600 dark:text-red-400">-2 pts</td>
                    </tr>
                </tbody>
                </table>
            </div>
            
            {/* Strike Rate Bonus */}
            <div>
                <h4 className="font-semibold mb-3 pt-2">Strike Rate Bonus <span className="text-xs">(min. 10 balls)</span></h4>
                
                {/* Center line indicator */}
                <div className="mb-3 flex items-center justify-center">
                <div className="w-full h-0.5 bg-neutral-300 dark:bg-neutral-600 relative">
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-4 bg-neutral-400 dark:bg-neutral-500"></div>
                </div>
                </div>
                
                {/* SR 200+ */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-700 dark:text-green-300">200+</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-500 w-full"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-700 dark:text-green-300">+6 pts</div>
                </div>
                
                {/* SR 175+ */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-600 dark:text-green-400">175+</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-400 w-2/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-600 dark:text-green-400">+4 pts</div>
                </div>
                
                {/* SR 150+ */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-500 dark:text-green-500">150+</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-300 w-1/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-500 dark:text-green-500">+2 pts</div>
                </div>
                
                {/* SR <100 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-red-500 dark:text-red-400">&lt;100</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-300 w-1/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-500 dark:text-red-400">-2 pts</div>
                </div>
                
                {/* SR <75 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-red-600 dark:text-red-300">&lt;75</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-400 w-2/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-600 dark:text-red-300">-4 pts</div>
                </div>
                
                {/* SR <50 */}
                <div className="flex items-center">
                <div className="w-16 text-xs font-semibold text-red-700 dark:text-red-300">&lt;50</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-500 w-full"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-700 dark:text-red-300">-6 pts</div>
                </div>
            </div>
            </div>
        </div>
        
        {/* Bowling Points - Full width */}
        <div className="p-5 bg-white dark:bg-neutral-800 border-l-4 border-green-500 dark:border-green-400 mb-6">
            <h3 className="text-xl font-semibold mb-4 text-green-700 dark:text-green-300 font-caption">Bowling</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Bowling Points */}
            <div>
                <table className="w-full">
                <tbody>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Wicket</td>
                    <td className="py-2 text-right font-bold">25 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Maiden</td>
                    <td className="py-2 text-right font-bold">8 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">3+ Wickets</td>
                    <td className="py-2 text-right font-bold">8 pts</td>
                    </tr>
                    <tr>
                    <td className="py-2">5+ Wickets</td>
                    <td className="py-2 text-right font-bold">16 pts</td>
                    </tr>
                </tbody>
                </table>
            </div>
            
            {/* Economy Bonus */}
            <div>
                <h4 className="font-semibold mb-3 pt-2">Economy Bonus <span className="text-xs">(min. 10 balls)</span></h4>
                
                {/* Center line indicator */}
                <div className="mb-3 flex items-center justify-center">
                <div className="w-full h-0.5 bg-neutral-300 dark:bg-neutral-600 relative">
                    <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-4 bg-neutral-400 dark:bg-neutral-500"></div>
                </div>
                </div>
                
                {/* Economy <5 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-700 dark:text-green-300">&lt;5</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-500 w-full"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-700 dark:text-green-300">+6 pts</div>
                </div>
                
                {/* Economy 5-6 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-600 dark:text-green-400">5-6</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-400 w-2/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-600 dark:text-green-400">+4 pts</div>
                </div>
                
                {/* Economy 6-7 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-green-500 dark:text-green-500">6-7</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute left-1/2 w-1/2 h-full">
                        <div className="h-full rounded-r bg-green-300 w-1/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-green-500 dark:text-green-500">+2 pts</div>
                </div>
                
                {/* Economy 10-11 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-red-500 dark:text-red-400">10-11</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-300 w-1/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-500 dark:text-red-400">-2 pts</div>
                </div>
                
                {/* Economy 11-12 */}
                <div className="flex items-center mb-2">
                <div className="w-16 text-xs font-semibold text-red-600 dark:text-red-300">11-12</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-400 w-2/3"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-600 dark:text-red-300">-4 pts</div>
                </div>
                
                {/* Economy 12+ */}
                <div className="flex items-center">
                <div className="w-16 text-xs font-semibold text-red-700 dark:text-red-300">12+</div>
                <div className="flex-grow mx-2">
                    <div className="relative h-2 w-full">
                    <div className="absolute right-1/2 w-1/2 h-full flex justify-end">
                        <div className="h-full rounded-l bg-red-500 w-full"></div>
                    </div>
                    </div>
                </div>
                <div className="w-16 text-right text-xs font-semibold text-red-700 dark:text-red-300">-6 pts</div>
                </div>
            </div>
            </div>
        </div>
        
        {/* Fielding & Other Points - Full width */}
        <div className="p-4 bg-white dark:bg-neutral-800 border-l-4 border-yellow-500 dark:border-yellow-400">
            <h3 className="text-xl font-semibold mb-4 text-yellow-700 dark:text-yellow-300 font-caption">Fielding & Other</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fielding Points */}
            <div>
                <h4 className="font-semibold mb-2">Fielding</h4>
                <table className="w-full">
                <tbody>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Stumping</td>
                    <td className="py-2 text-right font-bold">12 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Per Catch</td>
                    <td className="py-2 text-right font-bold">8 pts</td>
                    </tr>
                    <tr className="border-b border-neutral-100 dark:border-neutral-700">
                    <td className="py-2">Run Out (single fielder)</td>
                    <td className="py-2 text-right font-bold">8 pts</td>
                    </tr>
                </tbody>
                </table>
            </div>
            
            {/* Bonus Points */}
            <div>
                <h4 className="font-semibold mb-2">Bonus Points</h4>
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg">
                <table className="w-full">
                    <tbody>
                    <tr className="border-b border-neutral-100 dark:border-yellow-800/30">
                        <td className="py-2">Player of the Match</td>
                        <td className="py-2 text-right font-bold text-purple-600 dark:text-purple-400">50 pts</td>
                    </tr>
                    <tr>
                        <td className="py-2">Playing in match</td>
                        <td className="py-2 text-right font-bold">4 pts</td>
                    </tr>
                    </tbody>
                </table>
                </div>
            </div>
            </div>
        </div>
        </AccordionItem>

      {/* Boosts Section */}
      <AccordionItem 
        title="Player Boosts" 
        icon={<Zap className="text-yellow-500 dark:text-yellow-400" size={24} />}
        isOpen={openSection === 'boosts'}
        toggleAccordion={() => toggleAccordion('boosts')}
      >
        <div className="space-y-6">
          <p>
            Player Boosts allow you to assign 8 specialized roles to players in your Squad, 
            each providing unique point multipliers to amplify your team's performance. Choose wisely as these 
            roles can dramatically impact your weekly score!
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Captain */}
            <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Crown className="text-blue-600 dark:text-blue-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-blue-700 dark:text-blue-300">Captain</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> Any role</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 2× all points</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Best for your star player and top point getter.</p>
            </div>
            
            {/* Vice Captain */}
            <div className="bg-neutral-50 dark:bg-neutral-900/40 border border-primary-200 dark:border-primary-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Swords className="text-primary-600 dark:text-primary-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-primary-700 dark:text-primary-300">Vice Captain</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> Any role</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 1.5× all points</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Great for reliable, consistent performers who regularly contribute substantial points.</p>
            </div>
            
            {/* Slogger */}
            <div className="bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Zap className="text-red-600 dark:text-red-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-red-700 dark:text-red-300">Slogger</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> BAT, WK</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 2× Strike Rate, 2× Fours, 2× Sixes, 1.5× Runs, 1.5× Batting Milestones</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Perfect for big hitters known for clearing the ropes.</p>
            </div>
            
            {/* Accumulator */}
            <div className="bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Anchor className="text-green-600 dark:text-green-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-green-700 dark:text-green-300">Accumulator</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> BAT, WK</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 1.5× Strike Rate, 1.5× Fours, 1.5× Sixes, 2× Runs, 2× Batting Milestones</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Ideal for anchor batsmen who build big innings.</p>
            </div>
            
            {/* Safe Hands */}
            <div className="bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Handshake className="text-amber-600 dark:text-amber-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-amber-700 dark:text-amber-300">Safe Hands</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> WK</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 2× Fielding, 1.5× Runs, 1.5× Batting Milestones</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Perfect for wicket-keepers who can bat.</p>
            </div>
            
            {/* Rattler */}
            <div className="bg-purple-50 dark:bg-purple-900/40 border border-purple-200 dark:border-purple-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Bomb className="text-purple-600 dark:text-purple-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-purple-700 dark:text-purple-300">Rattler</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> BOWL</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 2× Wickets, 2× Bowling Milestones, 1.5× Maidens, 1.5× Economy</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Ideal for strike bowlers who take lots of wickets.</p>
            </div>
            
            {/* Guardian */}
            <div className="bg-teal-50 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Shield className="text-teal-600 dark:text-teal-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-teal-700 dark:text-teal-300">Guardian</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> BOWL</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 1.5× Wickets, 1.5× Bowling Milestones, 2× Maidens, 2× Economy</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Great for economical bowlers who keep the runs down.</p>
            </div>
            
            {/* Virtuoso */}
            <div className="bg-orange-50 dark:bg-orange-900/40 border border-orange-200 dark:border-orange-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center mb-2">
                <Sparkles className="text-orange-600 dark:text-orange-400 mr-2" size={20} />
                <h3 className="font-bold text-lg text-orange-700 dark:text-orange-300">Virtuoso</h3>
              </div>
              <p className="text-sm mb-2"><strong>Eligible:</strong> ALL</p>
              <p className="text-sm mb-2"><strong>Boost:</strong> 1.5× Runs, 1.5× Wickets, 1.5× Strike Rate, 1.5× Economy, 1.5× Fielding</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Perfect for balanced all-rounders who contribute in all aspects.</p>
            </div>
          </div>
          
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6 mt-6">
            <h3 className="text-xl font-semibold mb-4 font-caption">Weekly Selection Rules</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2 flex items-center font-caption">
                  <Clock size={18} className="text-blue-500 dark:text-blue-400 mr-2" />
                  Weekly Selection & Lock Times
                </h4>
                <ul className="text-sm space-y-2 list-disc pl-5">
                  <li>You can freely update all Boost roles weekly for any player in your Squad</li>
                  <li>Roles lock in right before the first match of each week</li>
                  <li>If no changes are made, the previous week's assignments carry over</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center">
                  <Repeat size={18} className="text-green-500 dark:text-green-400 mr-2" />
                  Mid-Week Trading Rules
                </h4>
                <ul className="text-sm space-y-2 list-disc pl-5">
                  <li>Once a new week starts, all Boost roles are locked for that week</li>
                  <li>If a player with a Boost role is traded, the incoming player automatically inherits that role for the remainder of the week</li>
                  <li>Boost roles cannot be reassigned mid-week</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center text-blue-700 dark:text-blue-300">
                Pro Tip:
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Balance your Boost role assignments based on upcoming matches. If your player has two matches in a week,
                their boost effect applies to both games! Choose players who are in form and have favorable matchups.
              </p>
            </div>
          </div>
        </div>
      </AccordionItem>

      {/* Trading Section */}
      <AccordionItem 
        title="Player Trading" 
        icon={<Repeat className="text-purple-500 dark:text-purple-400" size={24} />}
        isOpen={openSection === 'trading'}
        toggleAccordion={() => toggleAccordion('trading')}
      >
        <div className="space-y-6">
          <p className="mb-6">
            Trading is a key strategic element in Pitch Perfect. It allows you to adapt your Squad throughout 
            the season, balance your team composition, and respond to player injuries or form changes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-neutral-800 border-l-4 border-purple-500 dark:border-purple-400 p-5">
              <h3 className="text-xl font-semibold mb-3 text-purple-700 dark:text-purple-300">Trading Mechanics</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>You can trade players with other Squads at any point between games</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>Propose trades by specifying which players you want to exchange</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>The recipient can accept or reject your trade proposal</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>For the 2025 season, there are no trading limits</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-neutral-800 border-l-4 border-green-500 dark:border-green-400 p-5">
              <h3 className="text-xl font-semibold mb-3 text-green-700 dark:text-green-300">Strategic Reasons to Trade</h3>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>Balance your Squad's composition (batters vs. bowlers)</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>Diversify by acquiring players from multiple teams for better point opportunities</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>React to player injuries or sudden drops in form (and hoping the other manager isn't aware of that!)</span>
                </li>
                <li className="flex items-start">
                  <Check size={18} className="text-green-500 dark:text-green-400 mr-2 mt-1 flex-shrink-0" />
                  <span>Replace a boosted player mid-week (the incoming player inherits the boost)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </AccordionItem>
    </div>
  );
};

export default HowItWorksComponent;
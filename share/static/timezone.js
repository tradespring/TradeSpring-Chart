/*
 * Copyright 2010 Matthew Eernisse (mde@fleegix.org)
 * and Open Source Applications Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Credits: Ideas included from incomplete JS implementation of Olson
 * parser, "XMLDAte" by Philippe Goetz (philippe.goetz@wanadoo.fr)
 *
 * Contributions:
 * Jan Niehusmann
 * Ricky Romero
 * Preston Hunt (prestonhunt@gmail.com),
 * Dov. B Katz (dov.katz@morganstanley.com),
 * Peter Bergström (pbergstr@mac.com)
*/

if (typeof timezoneJS == 'undefined') { timezoneJS = {}; }

timezoneJS.Date = function () {
  var args = Array.prototype.slice.apply(arguments);
  var t = null;
  var dt = null;
  var tz = null;
  var utc = false;

  // No args -- create a floating date based on the current local offset
  if (args.length === 0) {
    dt = new Date();
  }
  // Date string or timestamp -- assumes floating
  else if (args.length == 1) {
    dt = new Date(args[0]);
  }
  // Date string or timestamp -- given timezone
  else if (args.length == 2) {
    tz = args.pop();
    dt = new Date.UTC(args[0]);
  }
  // year, month, [date,] [hours,] [minutes,] [seconds,] [milliseconds,] [tzId,] [utc]
  else {
    t = args[args.length-1];
    // Last arg is utc
    if (typeof t == 'boolean') {
      utc = args.pop();
      tz = args.pop();
    }
    // Last arg is tzId
    else if (typeof t == 'string') {
      tz = args.pop();
      if (tz == 'Etc/UTC' || tz == 'Etc/GMT') {
        utc = true;
      }
    }

    // Date string (e.g., '12/27/2006')
    t = args[args.length-1];
    if (typeof t == 'string') {
      dt = new Date(args[0]);
    }
    // Date part numbers
    else {
      var a = [];
      for (var i = 0; i < 8; i++) {
        a[i] = args[i] || 0;
      }
      dt = new Date(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7]);
    }
  }
  this._useCache = false;
  this._tzInfo = {};
  this._tzAbbr = '';
  this._day = 0;
  this.year = 0;
  this.month = 0;
  this.date = 0;
  this.hours= 0;
  this.minutes = 0;
  this.seconds = 0;
  this.milliseconds = 0;
  this.timezone = tz || null;
  this.utc = utc || false;
  this.setFromDateObjProxy(dt);
};

timezoneJS.Date.prototype = {
  getDate: function () { return this.date; },
  getDay: function () { return this._day; },
  getFullYear: function () { return this.year; },
  getMonth: function () { return this.month; },
  getYear: function () { return this.year; },
  getHours: function () {
    return this.hours;
  },
  getMilliseconds: function () {
    return this.milliseconds;
  },
  getMinutes: function () {
    return this.minutes;
  },
  getSeconds: function () {
    return this.seconds;
  },
  getTime: function () {
    var dt = Date.UTC(this.year, this.month, this.date,
      this.hours, this.minutes, this.seconds, this.milliseconds);
    return dt + (this.getTimezoneOffset()*60*1000);
  },
  getTimezone: function () {
    return this.timezone;
  },
  getTimezoneOffset: function () {
    var info = this.getTimezoneInfo();
    return info.tzOffset;
  },
  getTimezoneAbbreviation: function () {
    var info = this.getTimezoneInfo();
    return info.tzAbbr;
  },
  getTimezoneInfo: function () {
    var res;
    if (this.utc) {
      res = { tzOffset: 0,
        tzAbbr: 'UTC' };
    }
    else {
      if (this._useCache) {
        res = this._tzInfo;
      }
      else {
        if (this.timezone) {
          var dt = new Date(Date.UTC(this.year, this.month, this.date,
            this.hours, this.minutes, this.seconds, this.milliseconds));
          var tz = this.timezone;
          res = timezoneJS.timezone.getTzInfo(dt, tz);
        }
        // Floating -- use local offset
        else {
          res = { tzOffset: this.getLocalOffset(),
            tzAbbr: null };
        }
        this._tzInfo = res;
        this._useCache = true;
      }
    }
    return res;
  },
  getUTCDate: function () {
    return this.getUTCDateProxy().getUTCDate();
  },
  getUTCDay: function () {
    return this.getUTCDateProxy().getUTCDay();
  },
  getUTCFullYear: function () {
    return this.getUTCDateProxy().getUTCFullYear();
  },
  getUTCHours: function () {
    return this.getUTCDateProxy().getUTCHours();
  },
  getUTCMilliseconds: function () {
    return this.getUTCDateProxy().getUTCMilliseconds();
  },
  getUTCMinutes: function () {
    return this.getUTCDateProxy().getUTCMinutes();
  },
  getUTCMonth: function () {
    return this.getUTCDateProxy().getUTCMonth();
  },
  getUTCSeconds: function () {
    return this.getUTCDateProxy().getUTCSeconds();
  },
  setDate: function (n) {
    this.setAttribute('date', n);
  },
  setFullYear: function (n) {
    this.setAttribute('year', n);
  },
  setMonth: function (n) {
    this.setAttribute('month', n);
  },
  setYear: function (n) {
    this.setUTCAttribute('year', n);
  },
  setHours: function (n) {
    this.setAttribute('hours', n);
  },
  setMilliseconds: function (n) {
    this.setAttribute('milliseconds', n);
  },
  setMinutes: function (n) {
    this.setAttribute('minutes', n);
  },
  setSeconds: function (n) {
    this.setAttribute('seconds', n);
  },
  setTime: function (n) {
    if (isNaN(n)) { throw new Error('Units must be a number.'); }
    var dt = new Date(0);
    dt.setUTCMilliseconds(n - (this.getTimezoneOffset()*60*1000));
    this.setFromDateObjProxy(dt, true);
  },
  setUTCDate: function (n) {
    this.setUTCAttribute('date', n);
  },
  setUTCFullYear: function (n) {
    this.setUTCAttribute('year', n);
  },
  setUTCHours: function (n) {
    this.setUTCAttribute('hours', n);
  },
  setUTCMilliseconds: function (n) {
    this.setUTCAttribute('milliseconds', n);
  },
  setUTCMinutes: function (n) {
    this.setUTCAttribute('minutes', n);
  },
  setUTCMonth: function (n) {
    this.setUTCAttribute('month', n);
  },
  setUTCSeconds: function (n) {
    this.setUTCAttribute('seconds', n);
  },
  toGMTString: function () {},
  toLocaleString: function () {},
  toLocaleDateString: function () {},
  toLocaleTimeString: function () {},
  toSource: function () {},
  toString: function () {
    // Get a quick looky at what's in there
    var str = this.getFullYear() + '-' + (this.getMonth()+1) + '-' + this.getDate();
    var hou = this.getHours() || 12;
    hou = String(hou);
    var min = String(this.getMinutes());
    if (min.length == 1) { min = '0' + min; }
    var sec = String(this.getSeconds());
    if (sec.length == 1) { sec = '0' + sec; }
    str += ' ' + hou;
    str += ':' + min;
    str += ':' + sec;
    return str;
  },
  toUTCString: function () {},
  valueOf: function () {
    return this.getTime();
  },
  clone: function () {
    return new timezoneJS.Date(this.year, this.month, this.date,
      this.hours, this.minutes, this.seconds, this.milliseconds,
      this.timezone);
  },
  setFromDateObjProxy: function (dt, fromUTC) {
    this.year = fromUTC ? dt.getUTCFullYear() : dt.getFullYear();
    this.month = fromUTC ? dt.getUTCMonth() : dt.getMonth();
    this.date = fromUTC ? dt.getUTCDate() : dt.getDate();
    this.hours = fromUTC ? dt.getUTCHours() : dt.getHours();
    this.minutes = fromUTC ? dt.getUTCMinutes() : dt.getMinutes();
    this.seconds = fromUTC ? dt.getUTCSeconds() : dt.getSeconds();
    this.milliseconds = fromUTC ? dt.getUTCMilliseconds() : dt.getMilliseconds();
    this._day = fromUTC ? dt.getUTCDay() : dt.getDay();
    this.utc = fromUTC;
    this._useCache = false;
  },
  getUTCDateProxy: function () {
    var dt = new Date(Date.UTC(this.year, this.month, this.date,
      this.hours, this.minutes, this.seconds, this.milliseconds));
    dt.setUTCMinutes(dt.getUTCMinutes() + this.getTimezoneOffset());
    return dt;
  },
  setAttribute: function (unit, n) {
    if (isNaN(n)) { throw new Error('Units must be a number.'); }
    var dt = new Date(this.year, this.month, this.date,
      this.hours, this.minutes, this.seconds, this.milliseconds);
    var meth = unit == 'year' ? 'FullYear' : unit.substr(0, 1).toUpperCase() +
      unit.substr(1);
    dt['set' + meth](n);
    this.setFromDateObjProxy(dt);
  },
  setUTCAttribute: function (unit, n) {
    if (isNaN(n)) { throw new Error('Units must be a number.'); }
    var meth = unit == 'year' ? 'FullYear' : unit.substr(0, 1).toUpperCase() +
      unit.substr(1);
    var dt = this.getUTCDateProxy();
    dt['setUTC' + meth](n);
    dt.setUTCMinutes(dt.getUTCMinutes() - this.getTimezoneOffset());
    this.setFromDateObjProxy(dt, true);
  },
  setTimezone: function (tz) {
    if (tz == 'Etc/UTC' || tz == 'Etc/GMT') {
      this.utc = true;
    } else {
      this.utc = false;
    }
    this.timezone = tz;
    this._useCache = false;
  },
  removeTimezone: function () {
    this.utc = false;
    this.timezone = null;
    this._useCache = false;
  },
  civilToJulianDayNumber: function (y, m, d) {
    var a;
    // Adjust for zero-based JS-style array
    m++;
    if (m > 12) {
      a = parseInt(m/12, 10);
      m = m % 12;
      y += a;
    }
    if (m <= 2) {
      y -= 1;
      m += 12;
    }
    a = Math.floor(y / 100);
    var b = 2 - a + Math.floor(a / 4);
    jDt = Math.floor(365.25 * (y + 4716)) +
      Math.floor(30.6001 * (m + 1)) +
      d + b - 1524;
    return jDt;
  },
  getLocalOffset: function () {
    var dt = this;
    var d = new Date(dt.getYear(), dt.getMonth(), dt.getDate(),
      dt.getHours(), dt.getMinutes(), dt.getSeconds());
    return d.getTimezoneOffset();
  },
  convertToTimezone: function(tz) {
    var dt = new Date();
    res = timezoneJS.timezone.getTzInfo(dt, tz);
    
    convert_offset = this.getTimezoneOffset() - res.tzOffset // offset in minutes
    converted_date = new timezoneJS.Date(this + convert_offset*60*1000)
//    converted_date = new Date(this + convert_offset*60*1000)
    this.setFromDateObjProxy(converted_date, true)
    this.setTimezone(tz)
  }
};

timezoneJS.timezone = new function() {
  var _this = this;
  var monthMap = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3,'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
  var dayMap = {'sun': 0,'mon' :1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
  var regionMap = {'EST':'northamerica','MST':'northamerica','HST':'northamerica','EST5EDT':'northamerica','CST6CDT':'northamerica','MST7MDT':'northamerica','PST8PDT':'northamerica','America':'northamerica','Pacific':'australasia','Atlantic':'europe','Africa':'africa','Indian':'africa','Antarctica':'antarctica','Asia':'asia','Australia':'australasia','Europe':'europe','WET':'europe','CET':'europe','MET':'europe','EET':'europe'};
  var regionExceptions = {'Pacific/Honolulu':'northamerica','Atlantic/Bermuda':'northamerica','Atlantic/Cape_Verde':'africa','Atlantic/St_Helena':'africa','Indian/Kerguelen':'antarctica','Indian/Chagos':'asia','Indian/Maldives':'asia','Indian/Christmas':'australasia','Indian/Cocos':'australasia','America/Danmarkshavn':'europe','America/Scoresbysund':'europe','America/Godthab':'europe','America/Thule':'europe','Asia/Yekaterinburg':'europe','Asia/Omsk':'europe','Asia/Novosibirsk':'europe','Asia/Krasnoyarsk':'europe','Asia/Irkutsk':'europe','Asia/Yakutsk':'europe','Asia/Vladivostok':'europe','Asia/Sakhalin':'europe','Asia/Magadan':'europe','Asia/Kamchatka':'europe','Asia/Anadyr':'europe','Africa/Ceuta':'europe','America/Argentina/Buenos_Aires':'southamerica','America/Argentina/Cordoba':'southamerica','America/Argentina/Tucuman':'southamerica','America/Argentina/La_Rioja':'southamerica','America/Argentina/San_Juan':'southamerica','America/Argentina/Jujuy':'southamerica','America/Argentina/Catamarca':'southamerica','America/Argentina/Mendoza':'southamerica','America/Argentina/Rio_Gallegos':'southamerica','America/Argentina/Ushuaia':'southamerica','America/Aruba':'southamerica','America/La_Paz':'southamerica','America/Noronha':'southamerica','America/Belem':'southamerica','America/Fortaleza':'southamerica','America/Recife':'southamerica','America/Araguaina':'southamerica','America/Maceio':'southamerica','America/Bahia':'southamerica','America/Sao_Paulo':'southamerica','America/Campo_Grande':'southamerica','America/Cuiaba':'southamerica','America/Porto_Velho':'southamerica','America/Boa_Vista':'southamerica','America/Manaus':'southamerica','America/Eirunepe':'southamerica','America/Rio_Branco':'southamerica','America/Santiago':'southamerica','Pacific/Easter':'southamerica','America/Bogota':'southamerica','America/Curacao':'southamerica','America/Guayaquil':'southamerica','Pacific/Galapagos':'southamerica','Atlantic/Stanley':'southamerica','America/Cayenne':'southamerica','America/Guyana':'southamerica','America/Asuncion':'southamerica','America/Lima':'southamerica','Atlantic/South_Georgia':'southamerica','America/Paramaribo':'southamerica','America/Port_of_Spain':'southamerica','America/Montevideo':'southamerica','America/Caracas':'southamerica'};

  function invalidTZError(t) {
    throw new Error('Timezone "' + t + '" is either incorrect, or not loaded in the timezone registry.');
  }
  function getRegionForTimezone(tz) {
    var exc = regionExceptions[tz];
    var ret;
    if (exc) {
      return exc;
    }
    else {
      reg = tz.split('/')[0];
      ret = regionMap[reg];
      // If there's nothing listed in the main regions for
      // this TZ, check the 'backward' links
      if (!ret) {
        var link = _this.zones[tz];
        if (typeof link == 'string') {
          return getRegionForTimezone(link);
        }
      }
      return ret;
    }
  }
  function parseTimeString(str) {
    var pat = /(\d+)(?::0*(\d*))?(?::0*(\d*))?([wsugz])?$/;
    var hms = str.match(pat);
    hms[1] = parseInt(hms[1], 10);
    hms[2] = hms[2] ? parseInt(hms[2], 10) : 0;
    hms[3] = hms[3] ? parseInt(hms[3], 10) : 0;
    return hms;
  }
  function getZone(dt, tz) {
    var t = tz;
    var zoneList = _this.zones[t];
    // Follow links to get to an acutal zone
    while (typeof zoneList == "string") {
      t = zoneList;
      zoneList = _this.zones[t];
    }
    for(var i = 0; i < zoneList.length; i++) {
      var z = zoneList[i];
      if (!z[3]) { break; }
      var yea = parseInt(z[3], 10);
      var mon = 11;
      var dat = 31;
      if (z[4]) {
        mon = monthMap[z[4].substr(0, 3).toLowerCase()];
        dat = parseInt(z[5], 10);
      }
      var t = z[6] ? z[6] : '23:59:59';
      t = parseTimeString(t);
      var d = Date.UTC(yea, mon, dat, t[1], t[2], t[3]);
      if (dt.getTime() < d) { break; }
    }
    if (i == zoneList.length) { throw new Error('No Zone found for "' + timezone + '" on ' + dt); }
    return zoneList[i];

  }
  function getBasicOffset(z) {
    var off = parseTimeString(z[0]);
    var adj = z[0].indexOf('-') == 0 ? -1 : 1
    off = adj * (((off[1] * 60 + off[2]) *60 + off[3]) * 1000);
    return -off/60/1000;
  }

  // if isUTC is true, date is given in UTC, otherwise it's given
  // in local time (ie. date.getUTC*() returns local time components)
  function getRule( date, zone, isUTC ) {
    var ruleset = zone[1];
    var basicOffset = getBasicOffset( zone );

    // Convert a date to UTC. Depending on the 'type' parameter, the date
    // parameter may be:
    // 'u', 'g', 'z': already UTC (no adjustment)
    // 's': standard time (adjust for time zone offset but not for DST)
    // 'w': wall clock time (adjust for both time zone and DST offset)
    //
    // DST adjustment is done using the rule given as third argument
    var convertDateToUTC = function( date, type, rule ) {
      var offset = 0;

      if(type == 'u' || type == 'g' || type == 'z') { // UTC
          offset = 0;
      } else if(type == 's') { // Standard Time
          offset = basicOffset;
      } else if(type == 'w' || !type ) { // Wall Clock Time
          offset = getAdjustedOffset(basicOffset,rule);
      } else {
          throw("unknown type "+type);
      }
      offset *= 60*1000; // to millis

      return new Date( date.getTime() + offset );
    }

    // Step 1:  Find applicable rules for this year.
    // Step 2:  Sort the rules by effective date.
    // Step 3:  Check requested date to see if a rule has yet taken effect this year.  If not,
    // Step 4:  Get the rules for the previous year.  If there isn't an applicable rule for last year, then
    //      there probably is no current time offset since they seem to explicitly turn off the offset
    //      when someone stops observing DST.
    //      FIXME if this is not the case and we'll walk all the way back (ugh).
    // Step 5:  Sort the rules by effective date.
    // Step 6:  Apply the most recent rule before the current time.

    var convertRuleToExactDateAndTime = function( yearAndRule, prevRule )
    {
      var year = yearAndRule[0];
      var rule = yearAndRule[1];

      // Assume that the rule applies to the year of the given date.
      var months = {
        "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
        "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
      };

      var days = {
        "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6
      }

      var hms = parseTimeString( rule[ 5 ] );
      var effectiveDate;

      if ( !isNaN( rule[ 4 ] ) ) // If we have a specific date, use that!
      {
        effectiveDate = new Date( Date.UTC( year, months[ rule[ 3 ] ], rule[ 4 ], hms[ 1 ], hms[ 2 ], hms[ 3 ], 0 ) );
      }
      else // Let's hunt for the date.
      {
        var targetDay,
          operator;

        if ( rule[ 4 ].substr( 0, 4 ) === "last" ) // Example: lastThu
        {
          // Start at the last day of the month and work backward.
          effectiveDate = new Date( Date.UTC( year, months[ rule[ 3 ] ] + 1, 1, hms[ 1 ] - 24, hms[ 2 ], hms[ 3 ], 0 ) );
          targetDay = days[ rule[ 4 ].substr( 4, 3 ).toLowerCase( ) ];
          operator = "<=";
        }
        else // Example: Sun>=15
        {
          // Start at the specified date.
          effectiveDate = new Date( Date.UTC( year, months[ rule[ 3 ] ], rule[ 4 ].substr( 5 ), hms[ 1 ], hms[ 2 ], hms[ 3 ], 0 ) );
          targetDay = days[ rule[ 4 ].substr( 0, 3 ).toLowerCase( ) ];
          operator = rule[ 4 ].substr( 3, 2 );
        }

        var ourDay = effectiveDate.getUTCDay( );

        if ( operator === ">=" ) // Go forwards.
        {
          effectiveDate.setUTCDate( effectiveDate.getUTCDate( ) + ( targetDay - ourDay + ( ( targetDay < ourDay ) ? 7 : 0 ) ) );
        }
        else // Go backwards.  Looking for the last of a certain day, or operator is "<=" (less likely).
        {
          effectiveDate.setUTCDate( effectiveDate.getUTCDate( ) + ( targetDay - ourDay - ( ( targetDay > ourDay ) ? 7 : 0 ) ) );
        }
      }

      // if previous rule is given, correct for the fact that the starting time of the current
      // rule may be specified in local time
      if(prevRule) {
        effectiveDate = convertDateToUTC(effectiveDate, hms[4], prevRule);
      }

      return effectiveDate;
    }

    var findApplicableRules = function( year, ruleset )
    {
      var applicableRules = [];

      for ( var i in ruleset )
      {
        if ( Number( ruleset[ i ][ 0 ] ) <= year ) // Exclude future rules.
        {
          if (
            Number( ruleset[ i ][ 1 ] ) >= year                                            // Date is in a set range.
            || ( Number( ruleset[ i ][ 0 ] ) === year && ruleset[ i ][ 1 ] === "only" )    // Date is in an "only" year.
            || ruleset[ i ][ 1 ] === "max"                                                 // We're in a range from the start year to infinity.
          )
          {
            // It's completely okay to have any number of matches here.
            // Normally we should only see two, but that doesn't preclude other numbers of matches.
            // These matches are applicable to this year.
            applicableRules.push( [year, ruleset[ i ]] );
          }
        }
      }

      return applicableRules;
    }

    var compareDates = function( a, b, prev )
    {
      if ( a.constructor !== Date ) {
        a = convertRuleToExactDateAndTime( a, prev );
      } else if(prev) {
        a = convertDateToUTC(a, isUTC?'u':'w', prev);
      }
      if ( b.constructor !== Date ) {
        b = convertRuleToExactDateAndTime( b, prev );
      } else if(prev) {
        b = convertDateToUTC(b, isUTC?'u':'w', prev);
      }

      a = Number( a );
      b = Number( b );

      return a - b;
    }

    var year = date.getUTCFullYear( );
    var applicableRules;

    applicableRules = findApplicableRules( year, _this.rules[ ruleset ] );
    applicableRules.push( date );
    // While sorting, the time zone in which the rule starting time is specified
    // is ignored. This is ok as long as the timespan between two DST changes is
    // larger than the DST offset, which is probably always true.
    // As the given date may indeed be close to a DST change, it may get sorted
    // to a wrong position (off by one), which is corrected below.
    applicableRules.sort( compareDates );

    if ( applicableRules.indexOf( date ) < 2 ) { // If there are not enough past DST rules...
      applicableRules = applicableRules.concat(findApplicableRules( year-1, _this.rules[ ruleset ] ));
      applicableRules.sort( compareDates );
    }

    var pinpoint = applicableRules.indexOf( date );
    if ( pinpoint > 1 && compareDates( date, applicableRules[pinpoint-1], applicableRules[pinpoint-2][1] ) < 0 ) {
      // the previous rule does not really apply, take the one before that
      return applicableRules[ pinpoint - 2 ][1];
    } else if ( pinpoint > 0 && pinpoint < applicableRules.length - 1 && compareDates( date, applicableRules[pinpoint+1], applicableRules[pinpoint-1][1] ) > 0) {
      // the next rule does already apply, take that one
      return applicableRules[ pinpoint + 1 ][1];
    } else if ( pinpoint === 0 ) {
      // no applicable rule found in this and in previous year
      return null;
    } else {
      return applicableRules[ pinpoint - 1 ][1];
    }
  }
  function getAdjustedOffset(off, rule) {
    var save = rule[6];
    var t = parseTimeString(save);
    var adj = save.indexOf('-') == 0 ? -1 : 1;
    var ret = (adj*(((t[1] *60 + t[2]) * 60 + t[3]) * 1000));
    ret = ret/60/1000;
    ret -= off
    ret = -Math.ceil(ret);
    return ret;
  }
  function getAbbreviation(zone, rule) {
    var res;
    var base = zone[2];
    if (base.indexOf('%s') > -1) {
      var repl;
      if (rule) {
        repl = rule[7]=='-'?'':rule[7];
      }
      // FIXME: Right now just falling back to Standard --
      // apparently ought to use the last valid rule,
      // although in practice that always ought to be Standard
      else {
        repl = 'S';
      }
      res = base.replace('%s', repl);
    }
    else if (base.indexOf('/') > -1) {
      // chose one of two alternative strings
      var t = parseTimeString(rule[6]);
      var isDst = (t[1])||(t[2])||(t[3]);
      res = base.split("/",2)[isDst?1:0];
    } else {
      res = base;
    }
    return res;
  }

  this.getTzInfo = function(dt, tz, isUTC) {
    var zone = getZone(dt, tz);
    var off = getBasicOffset(zone);
    // See if the offset needs adjustment
    var rule = getRule(dt, zone, isUTC);
    if (rule) {
      off = getAdjustedOffset(off, rule);
    }
    var abbr = getAbbreviation(zone, rule);
    return { tzOffset: off, tzAbbr: abbr };
  }
}

// Timezone data for: asia, northamerica
timezoneJS.timezone.zones = {"EST":[["-5:00","-","EST"]],"MST":[["-7:00","-","MST"]],"HST":[["-10:00","-","HST"]],"EST5EDT":[["-5:00","US","E%sT"]],"CST6CDT":[["-6:00","US","C%sT"]],"MST7MDT":[["-7:00","US","M%sT"]],"PST8PDT":[["-8:00","US","P%sT"]],"America/New_York":[["-4:56:02","-","LMT","1883","Nov","18","12:03:58"],["-5:00","US","E%sT","1920"],["-5:00","NYC","E%sT","1942"],["-5:00","US","E%sT","1946"],["-5:00","NYC","E%sT","1967"],["-5:00","US","E%sT"]],"America/Chicago":[["-5:50:36","-","LMT","1883","Nov","18","12:09:24"],["-6:00","US","C%sT","1920"],["-6:00","Chicago","C%sT","1936","Mar","1","2:00"],["-5:00","-","EST","1936","Nov","15","2:00"],["-6:00","Chicago","C%sT","1942"],["-6:00","US","C%sT","1946"],["-6:00","Chicago","C%sT","1967"],["-6:00","US","C%sT"]],"America/North_Dakota/Center":[["-6:45:12","-","LMT","1883","Nov","18","12:14:48"],["-7:00","US","M%sT","1992","Oct","25","02:00"],["-6:00","US","C%sT"]],"America/North_Dakota/New_Salem":[["-6:45:39","-","LMT","1883","Nov","18","12:14:21"],["-7:00","US","M%sT","2003","Oct","26","02:00"],["-6:00","US","C%sT"]],"America/North_Dakota/Beulah":[["-6:47:07","-","LMT","1883","Nov","18","12:12:53"],["-7:00","US","M%sT","2010","Nov","7","2:00"],["-6:00","US","C%sT"]],"America/Denver":[["-6:59:56","-","LMT","1883","Nov","18","12:00:04"],["-7:00","US","M%sT","1920"],["-7:00","Denver","M%sT","1942"],["-7:00","US","M%sT","1946"],["-7:00","Denver","M%sT","1967"],["-7:00","US","M%sT"]],"America/Los_Angeles":[["-7:52:58","-","LMT","1883","Nov","18","12:07:02"],["-8:00","US","P%sT","1946"],["-8:00","CA","P%sT","1967"],["-8:00","US","P%sT"]],"America/Juneau":[["15:02:19","-","LMT","1867","Oct","18"],["-8:57:41","-","LMT","1900","Aug","20","12:00"],["-8:00","-","PST","1942"],["-8:00","US","P%sT","1946"],["-8:00","-","PST","1969"],["-8:00","US","P%sT","1980","Apr","27","2:00"],["-9:00","US","Y%sT","1980","Oct","26","2:00",""],["-8:00","US","P%sT","1983","Oct","30","2:00"],["-9:00","US","Y%sT","1983","Nov","30"],["-9:00","US","AK%sT"]],"America/Sitka":[["-14:58:47","-","LMT","1867","Oct","18"],["-9:01:13","-","LMT","1900","Aug","20","12:00"],["-8:00","-","PST","1942"],["-8:00","US","P%sT","1946"],["-8:00","-","PST","1969"],["-8:00","US","P%sT","1983","Oct","30","2:00"],["-9:00","US","Y%sT","1983","Nov","30"],["-9:00","US","AK%sT"]],"America/Metlakatla":[["15:13:42","-","LMT","1867","Oct","18"],["-8:46:18","-","LMT","1900","Aug","20","12:00"],["-8:00","-","PST","1942"],["-8:00","US","P%sT","1946"],["-8:00","-","PST","1969"],["-8:00","US","P%sT","1983","Oct","30","2:00"],["-8:00","US","MeST"]],"America/Yakutat":[["14:41:05","-","LMT","1867","Oct","18"],["-9:18:55","-","LMT","1900","Aug","20","12:00"],["-9:00","-","YST","1942"],["-9:00","US","Y%sT","1946"],["-9:00","-","YST","1969"],["-9:00","US","Y%sT","1983","Nov","30"],["-9:00","US","AK%sT"]],"America/Anchorage":[["14:00:24","-","LMT","1867","Oct","18"],["-9:59:36","-","LMT","1900","Aug","20","12:00"],["-10:00","-","CAT","1942"],["-10:00","US","CAT/CAWT","1945","Aug","14","23:00u"],["-10:00","US","CAT/CAPT","1946",""],["-10:00","-","CAT","1967","Apr"],["-10:00","-","AHST","1969"],["-10:00","US","AH%sT","1983","Oct","30","2:00"],["-9:00","US","Y%sT","1983","Nov","30"],["-9:00","US","AK%sT"]],"America/Nome":[["12:58:21","-","LMT","1867","Oct","18"],["-11:01:38","-","LMT","1900","Aug","20","12:00"],["-11:00","-","NST","1942"],["-11:00","US","N%sT","1946"],["-11:00","-","NST","1967","Apr"],["-11:00","-","BST","1969"],["-11:00","US","B%sT","1983","Oct","30","2:00"],["-9:00","US","Y%sT","1983","Nov","30"],["-9:00","US","AK%sT"]],"America/Adak":[["12:13:21","-","LMT","1867","Oct","18"],["-11:46:38","-","LMT","1900","Aug","20","12:00"],["-11:00","-","NST","1942"],["-11:00","US","N%sT","1946"],["-11:00","-","NST","1967","Apr"],["-11:00","-","BST","1969"],["-11:00","US","B%sT","1983","Oct","30","2:00"],["-10:00","US","AH%sT","1983","Nov","30"],["-10:00","US","HA%sT"]],"Pacific/Honolulu":[["-10:31:26","-","LMT","1896","Jan","13","12:00",""],["-10:30","-","HST","1933","Apr","30","2:00",""],["-10:30","1:00","HDT","1933","May","21","12:00",""],["-10:30","-","HST","1942","Feb","09","2:00",""],["-10:30","1:00","HDT","1945","Sep","30","2:00",""],["-10:30","US","H%sT","1947","Jun","8","2:00",""],["-10:00","-","HST"]],"America/Phoenix":[["-7:28:18","-","LMT","1883","Nov","18","11:31:42"],["-7:00","US","M%sT","1944","Jan","1","00:01"],["-7:00","-","MST","1944","Apr","1","00:01"],["-7:00","US","M%sT","1944","Oct","1","00:01"],["-7:00","-","MST","1967"],["-7:00","US","M%sT","1968","Mar","21"],["-7:00","-","MST"]],"America/Shiprock":"America/Denver","America/Boise":[["-7:44:49","-","LMT","1883","Nov","18","12:15:11"],["-8:00","US","P%sT","1923","May","13","2:00"],["-7:00","US","M%sT","1974"],["-7:00","-","MST","1974","Feb","3","2:00"],["-7:00","US","M%sT"]],"America/Indiana/Indianapolis":[["-5:44:38","-","LMT","1883","Nov","18","12:15:22"],["-6:00","US","C%sT","1920"],["-6:00","Indianapolis","C%sT","1942"],["-6:00","US","C%sT","1946"],["-6:00","Indianapolis","C%sT","1955","Apr","24","2:00"],["-5:00","-","EST","1957","Sep","29","2:00"],["-6:00","-","CST","1958","Apr","27","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1971"],["-5:00","-","EST","2006"],["-5:00","US","E%sT"]],"America/Indiana/Marengo":[["-5:45:23","-","LMT","1883","Nov","18","12:14:37"],["-6:00","US","C%sT","1951"],["-6:00","Marengo","C%sT","1961","Apr","30","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1974","Jan","6","2:00"],["-6:00","1:00","CDT","1974","Oct","27","2:00"],["-5:00","US","E%sT","1976"],["-5:00","-","EST","2006"],["-5:00","US","E%sT"]],"America/Indiana/Vincennes":[["-5:50:07","-","LMT","1883","Nov","18","12:09:53"],["-6:00","US","C%sT","1946"],["-6:00","Vincennes","C%sT","1964","Apr","26","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1971"],["-5:00","-","EST","2006","Apr","2","2:00"],["-6:00","US","C%sT","2007","Nov","4","2:00"],["-5:00","US","E%sT"]],"America/Indiana/Tell_City":[["-5:47:03","-","LMT","1883","Nov","18","12:12:57"],["-6:00","US","C%sT","1946"],["-6:00","Perry","C%sT","1964","Apr","26","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1971"],["-5:00","-","EST","2006","Apr","2","2:00"],["-6:00","US","C%sT"]],"America/Indiana/Petersburg":[["-5:49:07","-","LMT","1883","Nov","18","12:10:53"],["-6:00","US","C%sT","1955"],["-6:00","Pike","C%sT","1965","Apr","25","2:00"],["-5:00","-","EST","1966","Oct","30","2:00"],["-6:00","US","C%sT","1977","Oct","30","2:00"],["-5:00","-","EST","2006","Apr","2","2:00"],["-6:00","US","C%sT","2007","Nov","4","2:00"],["-5:00","US","E%sT"]],"America/Indiana/Knox":[["-5:46:30","-","LMT","1883","Nov","18","12:13:30"],["-6:00","US","C%sT","1947"],["-6:00","Starke","C%sT","1962","Apr","29","2:00"],["-5:00","-","EST","1963","Oct","27","2:00"],["-6:00","US","C%sT","1991","Oct","27","2:00"],["-5:00","-","EST","2006","Apr","2","2:00"],["-6:00","US","C%sT"]],"America/Indiana/Winamac":[["-5:46:25","-","LMT","1883","Nov","18","12:13:35"],["-6:00","US","C%sT","1946"],["-6:00","Pulaski","C%sT","1961","Apr","30","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1971"],["-5:00","-","EST","2006","Apr","2","2:00"],["-6:00","US","C%sT","2007","Mar","11","2:00"],["-5:00","US","E%sT"]],"America/Indiana/Vevay":[["-5:40:16","-","LMT","1883","Nov","18","12:19:44"],["-6:00","US","C%sT","1954","Apr","25","2:00"],["-5:00","-","EST","1969"],["-5:00","US","E%sT","1973"],["-5:00","-","EST","2006"],["-5:00","US","E%sT"]],"America/Kentucky/Louisville":[["-5:43:02","-","LMT","1883","Nov","18","12:16:58"],["-6:00","US","C%sT","1921"],["-6:00","Louisville","C%sT","1942"],["-6:00","US","C%sT","1946"],["-6:00","Louisville","C%sT","1961","Jul","23","2:00"],["-5:00","-","EST","1968"],["-5:00","US","E%sT","1974","Jan","6","2:00"],["-6:00","1:00","CDT","1974","Oct","27","2:00"],["-5:00","US","E%sT"]],"America/Kentucky/Monticello":[["-5:39:24","-","LMT","1883","Nov","18","12:20:36"],["-6:00","US","C%sT","1946"],["-6:00","-","CST","1968"],["-6:00","US","C%sT","2000","Oct","29","2:00"],["-5:00","US","E%sT"]],"America/Detroit":[["-5:32:11","-","LMT","1905"],["-6:00","-","CST","1915","May","15","2:00"],["-5:00","-","EST","1942"],["-5:00","US","E%sT","1946"],["-5:00","Detroit","E%sT","1973"],["-5:00","US","E%sT","1975"],["-5:00","-","EST","1975","Apr","27","2:00"],["-5:00","US","E%sT"]],"America/Menominee":[["-5:50:27","-","LMT","1885","Sep","18","12:00"],["-6:00","US","C%sT","1946"],["-6:00","Menominee","C%sT","1969","Apr","27","2:00"],["-5:00","-","EST","1973","Apr","29","2:00"],["-6:00","US","C%sT"]],"America/St_Johns":[["-3:30:52","-","LMT","1884"],["-3:30:52","StJohns","N%sT","1918"],["-3:30:52","Canada","N%sT","1919"],["-3:30:52","StJohns","N%sT","1935","Mar","30"],["-3:30","StJohns","N%sT","1942","May","11"],["-3:30","Canada","N%sT","1946"],["-3:30","StJohns","N%sT"]],"America/Goose_Bay":[["-4:01:40","-","LMT","1884",""],["-3:30:52","-","NST","1918"],["-3:30:52","Canada","N%sT","1919"],["-3:30:52","-","NST","1935","Mar","30"],["-3:30","-","NST","1936"],["-3:30","StJohns","N%sT","1942","May","11"],["-3:30","Canada","N%sT","1946"],["-3:30","StJohns","N%sT","1966","Mar","15","2:00"],["-4:00","StJohns","A%sT"]],"America/Halifax":[["-4:14:24","-","LMT","1902","Jun","15"],["-4:00","Halifax","A%sT","1918"],["-4:00","Canada","A%sT","1919"],["-4:00","Halifax","A%sT","1942","Feb","9","2:00s"],["-4:00","Canada","A%sT","1946"],["-4:00","Halifax","A%sT","1974"],["-4:00","Canada","A%sT"]],"America/Glace_Bay":[["-3:59:48","-","LMT","1902","Jun","15"],["-4:00","Canada","A%sT","1953"],["-4:00","Halifax","A%sT","1954"],["-4:00","-","AST","1972"],["-4:00","Halifax","A%sT","1974"],["-4:00","Canada","A%sT"]],"America/Moncton":[["-4:19:08","-","LMT","1883","Dec","9"],["-5:00","-","EST","1902","Jun","15"],["-4:00","Canada","A%sT","1933"],["-4:00","Moncton","A%sT","1942"],["-4:00","Canada","A%sT","1946"],["-4:00","Moncton","A%sT","1973"],["-4:00","Canada","A%sT","1993"],["-4:00","Moncton","A%sT","2007"],["-4:00","Canada","A%sT"]],"America/Blanc-Sablon":[["-3:48:28","-","LMT","1884"],["-4:00","Canada","A%sT","1970"],["-4:00","-","AST"]],"America/Montreal":[["-4:54:16","-","LMT","1884"],["-5:00","Mont","E%sT","1918"],["-5:00","Canada","E%sT","1919"],["-5:00","Mont","E%sT","1942","Feb","9","2:00s"],["-5:00","Canada","E%sT","1946"],["-5:00","Mont","E%sT","1974"],["-5:00","Canada","E%sT"]],"America/Toronto":[["-5:17:32","-","LMT","1895"],["-5:00","Canada","E%sT","1919"],["-5:00","Toronto","E%sT","1942","Feb","9","2:00s"],["-5:00","Canada","E%sT","1946"],["-5:00","Toronto","E%sT","1974"],["-5:00","Canada","E%sT"]],"America/Thunder_Bay":[["-5:57:00","-","LMT","1895"],["-6:00","-","CST","1910"],["-5:00","-","EST","1942"],["-5:00","Canada","E%sT","1970"],["-5:00","Mont","E%sT","1973"],["-5:00","-","EST","1974"],["-5:00","Canada","E%sT"]],"America/Nipigon":[["-5:53:04","-","LMT","1895"],["-5:00","Canada","E%sT","1940","Sep","29"],["-5:00","1:00","EDT","1942","Feb","9","2:00s"],["-5:00","Canada","E%sT"]],"America/Rainy_River":[["-6:18:16","-","LMT","1895"],["-6:00","Canada","C%sT","1940","Sep","29"],["-6:00","1:00","CDT","1942","Feb","9","2:00s"],["-6:00","Canada","C%sT"]],"America/Atikokan":[["-6:06:28","-","LMT","1895"],["-6:00","Canada","C%sT","1940","Sep","29"],["-6:00","1:00","CDT","1942","Feb","9","2:00s"],["-6:00","Canada","C%sT","1945","Sep","30","2:00"],["-5:00","-","EST"]],"America/Winnipeg":[["-6:28:36","-","LMT","1887","Jul","16"],["-6:00","Winn","C%sT","2006"],["-6:00","Canada","C%sT"]],"America/Regina":[["-6:58:36","-","LMT","1905","Sep"],["-7:00","Regina","M%sT","1960","Apr","lastSun","2:00"],["-6:00","-","CST"]],"America/Swift_Current":[["-7:11:20","-","LMT","1905","Sep"],["-7:00","Canada","M%sT","1946","Apr","lastSun","2:00"],["-7:00","Regina","M%sT","1950"],["-7:00","Swift","M%sT","1972","Apr","lastSun","2:00"],["-6:00","-","CST"]],"America/Edmonton":[["-7:33:52","-","LMT","1906","Sep"],["-7:00","Edm","M%sT","1987"],["-7:00","Canada","M%sT"]],"America/Vancouver":[["-8:12:28","-","LMT","1884"],["-8:00","Vanc","P%sT","1987"],["-8:00","Canada","P%sT"]],"America/Dawson_Creek":[["-8:00:56","-","LMT","1884"],["-8:00","Canada","P%sT","1947"],["-8:00","Vanc","P%sT","1972","Aug","30","2:00"],["-7:00","-","MST"]],"America/Pangnirtung":[["0","-","zzz","1921",""],["-4:00","NT_YK","A%sT","1995","Apr","Sun>=1","2:00"],["-5:00","Canada","E%sT","1999","Oct","31","2:00"],["-6:00","Canada","C%sT","2000","Oct","29","2:00"],["-5:00","Canada","E%sT"]],"America/Iqaluit":[["0","-","zzz","1942","Aug",""],["-5:00","NT_YK","E%sT","1999","Oct","31","2:00"],["-6:00","Canada","C%sT","2000","Oct","29","2:00"],["-5:00","Canada","E%sT"]],"America/Resolute":[["0","-","zzz","1947","Aug","31",""],["-6:00","NT_YK","C%sT","2000","Oct","29","2:00"],["-5:00","-","EST","2001","Apr","1","3:00"],["-6:00","Canada","C%sT","2006","Oct","29","2:00"],["-5:00","Resolute","%sT"]],"America/Rankin_Inlet":[["0","-","zzz","1957",""],["-6:00","NT_YK","C%sT","2000","Oct","29","2:00"],["-5:00","-","EST","2001","Apr","1","3:00"],["-6:00","Canada","C%sT"]],"America/Cambridge_Bay":[["0","-","zzz","1920",""],["-7:00","NT_YK","M%sT","1999","Oct","31","2:00"],["-6:00","Canada","C%sT","2000","Oct","29","2:00"],["-5:00","-","EST","2000","Nov","5","0:00"],["-6:00","-","CST","2001","Apr","1","3:00"],["-7:00","Canada","M%sT"]],"America/Yellowknife":[["0","-","zzz","1935",""],["-7:00","NT_YK","M%sT","1980"],["-7:00","Canada","M%sT"]],"America/Inuvik":[["0","-","zzz","1953",""],["-8:00","NT_YK","P%sT","1979","Apr","lastSun","2:00"],["-7:00","NT_YK","M%sT","1980"],["-7:00","Canada","M%sT"]],"America/Whitehorse":[["-9:00:12","-","LMT","1900","Aug","20"],["-9:00","NT_YK","Y%sT","1966","Jul","1","2:00"],["-8:00","NT_YK","P%sT","1980"],["-8:00","Canada","P%sT"]],"America/Dawson":[["-9:17:40","-","LMT","1900","Aug","20"],["-9:00","NT_YK","Y%sT","1973","Oct","28","0:00"],["-8:00","NT_YK","P%sT","1980"],["-8:00","Canada","P%sT"]],"America/Cancun":[["-5:47:04","-","LMT","1922","Jan","1","0:12:56"],["-6:00","-","CST","1981","Dec","23"],["-5:00","Mexico","E%sT","1998","Aug","2","2:00"],["-6:00","Mexico","C%sT"]],"America/Merida":[["-5:58:28","-","LMT","1922","Jan","1","0:01:32"],["-6:00","-","CST","1981","Dec","23"],["-5:00","-","EST","1982","Dec","2"],["-6:00","Mexico","C%sT"]],"America/Matamoros":[["-6:40:00","-","LMT","1921","Dec","31","23:20:00"],["-6:00","-","CST","1988"],["-6:00","US","C%sT","1989"],["-6:00","Mexico","C%sT","2010"],["-6:00","US","C%sT"]],"America/Monterrey":[["-6:41:16","-","LMT","1921","Dec","31","23:18:44"],["-6:00","-","CST","1988"],["-6:00","US","C%sT","1989"],["-6:00","Mexico","C%sT"]],"America/Mexico_City":[["-6:36:36","-","LMT","1922","Jan","1","0:23:24"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","Mexico","C%sT","2001","Sep","30","02:00"],["-6:00","-","CST","2002","Feb","20"],["-6:00","Mexico","C%sT"]],"America/Ojinaga":[["-6:57:40","-","LMT","1922","Jan","1","0:02:20"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","-","CST","1996"],["-6:00","Mexico","C%sT","1998"],["-6:00","-","CST","1998","Apr","Sun>=1","3:00"],["-7:00","Mexico","M%sT","2010"],["-7:00","US","M%sT"]],"America/Chihuahua":[["-7:04:20","-","LMT","1921","Dec","31","23:55:40"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","-","CST","1996"],["-6:00","Mexico","C%sT","1998"],["-6:00","-","CST","1998","Apr","Sun>=1","3:00"],["-7:00","Mexico","M%sT"]],"America/Hermosillo":[["-7:23:52","-","LMT","1921","Dec","31","23:36:08"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","-","CST","1942","Apr","24"],["-7:00","-","MST","1949","Jan","14"],["-8:00","-","PST","1970"],["-7:00","Mexico","M%sT","1999"],["-7:00","-","MST"]],"America/Mazatlan":[["-7:05:40","-","LMT","1921","Dec","31","23:54:20"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","-","CST","1942","Apr","24"],["-7:00","-","MST","1949","Jan","14"],["-8:00","-","PST","1970"],["-7:00","Mexico","M%sT"]],"America/Bahia_Banderas":[["-7:01:00","-","LMT","1921","Dec","31","23:59:00"],["-7:00","-","MST","1927","Jun","10","23:00"],["-6:00","-","CST","1930","Nov","15"],["-7:00","-","MST","1931","May","1","23:00"],["-6:00","-","CST","1931","Oct"],["-7:00","-","MST","1932","Apr","1"],["-6:00","-","CST","1942","Apr","24"],["-7:00","-","MST","1949","Jan","14"],["-8:00","-","PST","1970"],["-7:00","Mexico","M%sT","2010","Apr","4","2:00"],["-6:00","Mexico","C%sT"]],"America/Tijuana":[["-7:48:04","-","LMT","1922","Jan","1","0:11:56"],["-7:00","-","MST","1924"],["-8:00","-","PST","1927","Jun","10","23:00"],["-7:00","-","MST","1930","Nov","15"],["-8:00","-","PST","1931","Apr","1"],["-8:00","1:00","PDT","1931","Sep","30"],["-8:00","-","PST","1942","Apr","24"],["-8:00","1:00","PWT","1945","Aug","14","23:00u"],["-8:00","1:00","PPT","1945","Nov","12",""],["-8:00","-","PST","1948","Apr","5"],["-8:00","1:00","PDT","1949","Jan","14"],["-8:00","-","PST","1954"],["-8:00","CA","P%sT","1961"],["-8:00","-","PST","1976"],["-8:00","US","P%sT","1996"],["-8:00","Mexico","P%sT","2001"],["-8:00","US","P%sT","2002","Feb","20"],["-8:00","Mexico","P%sT","2010"],["-8:00","US","P%sT"]],"America/Santa_Isabel":[["-7:39:28","-","LMT","1922","Jan","1","0:20:32"],["-7:00","-","MST","1924"],["-8:00","-","PST","1927","Jun","10","23:00"],["-7:00","-","MST","1930","Nov","15"],["-8:00","-","PST","1931","Apr","1"],["-8:00","1:00","PDT","1931","Sep","30"],["-8:00","-","PST","1942","Apr","24"],["-8:00","1:00","PWT","1945","Aug","14","23:00u"],["-8:00","1:00","PPT","1945","Nov","12",""],["-8:00","-","PST","1948","Apr","5"],["-8:00","1:00","PDT","1949","Jan","14"],["-8:00","-","PST","1954"],["-8:00","CA","P%sT","1961"],["-8:00","-","PST","1976"],["-8:00","US","P%sT","1996"],["-8:00","Mexico","P%sT","2001"],["-8:00","US","P%sT","2002","Feb","20"],["-8:00","Mexico","P%sT"]],"America/Anguilla":[["-4:12:16","-","LMT","1912","Mar","2"],["-4:00","-","AST"]],"America/Antigua":[["-4:07:12","-","LMT","1912","Mar","2"],["-5:00","-","EST","1951"],["-4:00","-","AST"]],"America/Nassau":[["-5:09:24","-","LMT","1912","Mar","2"],["-5:00","Bahamas","E%sT","1976"],["-5:00","US","E%sT"]],"America/Barbados":[["-3:58:28","-","LMT","1924",""],["-3:58:28","-","BMT","1932",""],["-4:00","Barb","A%sT"]],"America/Belize":[["-5:52:48","-","LMT","1912","Apr"],["-6:00","Belize","C%sT"]],"Atlantic/Bermuda":[["-4:19:04","-","LMT","1930","Jan","1","2:00",""],["-4:00","-","AST","1974","Apr","28","2:00"],["-4:00","Bahamas","A%sT","1976"],["-4:00","US","A%sT"]],"America/Cayman":[["-5:25:32","-","LMT","1890",""],["-5:07:12","-","KMT","1912","Feb",""],["-5:00","-","EST"]],"America/Costa_Rica":[["-5:36:20","-","LMT","1890",""],["-5:36:20","-","SJMT","1921","Jan","15",""],["-6:00","CR","C%sT"]],"America/Havana":[["-5:29:28","-","LMT","1890"],["-5:29:36","-","HMT","1925","Jul","19","12:00",""],["-5:00","Cuba","C%sT"]],"America/Dominica":[["-4:05:36","-","LMT","1911","Jul","1","0:01",""],["-4:00","-","AST"]],"America/Santo_Domingo":[["-4:39:36","-","LMT","1890"],["-4:40","-","SDMT","1933","Apr","1","12:00",""],["-5:00","DR","E%sT","1974","Oct","27"],["-4:00","-","AST","2000","Oct","29","02:00"],["-5:00","US","E%sT","2000","Dec","3","01:00"],["-4:00","-","AST"]],"America/El_Salvador":[["-5:56:48","-","LMT","1921",""],["-6:00","Salv","C%sT"]],"America/Grenada":[["-4:07:00","-","LMT","1911","Jul",""],["-4:00","-","AST"]],"America/Guadeloupe":[["-4:06:08","-","LMT","1911","Jun","8",""],["-4:00","-","AST"]],"America/St_Barthelemy":"America/Guadeloupe","America/Marigot":"America/Guadeloupe","America/Guatemala":[["-6:02:04","-","LMT","1918","Oct","5"],["-6:00","Guat","C%sT"]],"America/Port-au-Prince":[["-4:49:20","-","LMT","1890"],["-4:49","-","PPMT","1917","Jan","24","12:00",""],["-5:00","Haiti","E%sT"]],"America/Tegucigalpa":[["-5:48:52","-","LMT","1921","Apr"],["-6:00","Hond","C%sT"]],"America/Jamaica":[["-5:07:12","-","LMT","1890",""],["-5:07:12","-","KMT","1912","Feb",""],["-5:00","-","EST","1974","Apr","28","2:00"],["-5:00","US","E%sT","1984"],["-5:00","-","EST"]],"America/Martinique":[["-4:04:20","-","LMT","1890",""],["-4:04:20","-","FFMT","1911","May",""],["-4:00","-","AST","1980","Apr","6"],["-4:00","1:00","ADT","1980","Sep","28"],["-4:00","-","AST"]],"America/Montserrat":[["-4:08:52","-","LMT","1911","Jul","1","0:01",""],["-4:00","-","AST"]],"America/Managua":[["-5:45:08","-","LMT","1890"],["-5:45:12","-","MMT","1934","Jun","23",""],["-6:00","-","CST","1973","May"],["-5:00","-","EST","1975","Feb","16"],["-6:00","Nic","C%sT","1992","Jan","1","4:00"],["-5:00","-","EST","1992","Sep","24"],["-6:00","-","CST","1993"],["-5:00","-","EST","1997"],["-6:00","Nic","C%sT"]],"America/Panama":[["-5:18:08","-","LMT","1890"],["-5:19:36","-","CMT","1908","Apr","22",""],["-5:00","-","EST"]],"America/Puerto_Rico":[["-4:24:25","-","LMT","1899","Mar","28","12:00",""],["-4:00","-","AST","1942","May","3"],["-4:00","US","A%sT","1946"],["-4:00","-","AST"]],"America/St_Kitts":[["-4:10:52","-","LMT","1912","Mar","2",""],["-4:00","-","AST"]],"America/St_Lucia":[["-4:04:00","-","LMT","1890",""],["-4:04:00","-","CMT","1912",""],["-4:00","-","AST"]],"America/Miquelon":[["-3:44:40","-","LMT","1911","May","15",""],["-4:00","-","AST","1980","May"],["-3:00","-","PMST","1987",""],["-3:00","Canada","PM%sT"]],"America/St_Vincent":[["-4:04:56","-","LMT","1890",""],["-4:04:56","-","KMT","1912",""],["-4:00","-","AST"]],"America/Grand_Turk":[["-4:44:32","-","LMT","1890"],["-5:07:12","-","KMT","1912","Feb",""],["-5:00","TC","E%sT"]],"America/Tortola":[["-4:18:28","-","LMT","1911","Jul",""],["-4:00","-","AST"]],"America/St_Thomas":[["-4:19:44","-","LMT","1911","Jul",""],["-4:00","-","AST"]],"Asia/Kabul":[["4:36:48","-","LMT","1890"],["4:00","-","AFT","1945"],["4:30","-","AFT"]],"Asia/Yerevan":[["2:58:00","-","LMT","1924","May","2"],["3:00","-","YERT","1957","Mar",""],["4:00","RussiaAsia","YER%sT","1991","Mar","31","2:00s"],["3:00","1:00","YERST","1991","Sep","23",""],["3:00","RussiaAsia","AM%sT","1995","Sep","24","2:00s"],["4:00","-","AMT","1997"],["4:00","RussiaAsia","AM%sT"]],"Asia/Baku":[["3:19:24","-","LMT","1924","May","2"],["3:00","-","BAKT","1957","Mar",""],["4:00","RussiaAsia","BAK%sT","1991","Mar","31","2:00s"],["3:00","1:00","BAKST","1991","Aug","30",""],["3:00","RussiaAsia","AZ%sT","1992","Sep","lastSat","23:00"],["4:00","-","AZT","1996",""],["4:00","EUAsia","AZ%sT","1997"],["4:00","Azer","AZ%sT"]],"Asia/Bahrain":[["3:22:20","-","LMT","1920",""],["4:00","-","GST","1972","Jun"],["3:00","-","AST"]],"Asia/Dhaka":[["6:01:40","-","LMT","1890"],["5:53:20","-","HMT","1941","Oct",""],["6:30","-","BURT","1942","May","15",""],["5:30","-","IST","1942","Sep"],["6:30","-","BURT","1951","Sep","30"],["6:00","-","DACT","1971","Mar","26",""],["6:00","-","BDT","2009"],["6:00","Dhaka","BD%sT"]],"Asia/Thimphu":[["5:58:36","-","LMT","1947","Aug","15",""],["5:30","-","IST","1987","Oct"],["6:00","-","BTT",""]],"Indian/Chagos":[["4:49:40","-","LMT","1907"],["5:00","-","IOT","1996",""],["6:00","-","IOT"]],"Asia/Brunei":[["7:39:40","-","LMT","1926","Mar",""],["7:30","-","BNT","1933"],["8:00","-","BNT"]],"Asia/Rangoon":[["6:24:40","-","LMT","1880",""],["6:24:36","-","RMT","1920",""],["6:30","-","BURT","1942","May",""],["9:00","-","JST","1945","May","3"],["6:30","-","MMT",""]],"Asia/Phnom_Penh":[["6:59:40","-","LMT","1906","Jun","9"],["7:06:20","-","SMT","1911","Mar","11","0:01",""],["7:00","-","ICT","1912","May"],["8:00","-","ICT","1931","May"],["7:00","-","ICT"]],"Asia/Harbin":[["8:26:44","-","LMT","1928",""],["8:30","-","CHAT","1932","Mar",""],["8:00","-","CST","1940"],["9:00","-","CHAT","1966","May"],["8:30","-","CHAT","1980","May"],["8:00","PRC","C%sT"]],"Asia/Shanghai":[["8:05:52","-","LMT","1928"],["8:00","Shang","C%sT","1949"],["8:00","PRC","C%sT"]],"Asia/Chongqing":[["7:06:20","-","LMT","1928",""],["7:00","-","LONT","1980","May",""],["8:00","PRC","C%sT"]],"Asia/Urumqi":[["5:50:20","-","LMT","1928",""],["6:00","-","URUT","1980","May",""],["8:00","PRC","C%sT"]],"Asia/Kashgar":[["5:03:56","-","LMT","1928",""],["5:30","-","KAST","1940",""],["5:00","-","KAST","1980","May"],["8:00","PRC","C%sT"]],"Asia/Hong_Kong":[["7:36:36","-","LMT","1904","Oct","30"],["8:00","HK","HK%sT","1941","Dec","25"],["9:00","-","JST","1945","Sep","15"],["8:00","HK","HK%sT"]],"Asia/Taipei":[["8:06:00","-","LMT","1896",""],["8:00","Taiwan","C%sT"]],"Asia/Macau":[["7:34:20","-","LMT","1912"],["8:00","Macau","MO%sT","1999","Dec","20",""],["8:00","PRC","C%sT"]],"Asia/Nicosia":[["2:13:28","-","LMT","1921","Nov","14"],["2:00","Cyprus","EE%sT","1998","Sep"],["2:00","EUAsia","EE%sT"]],"Europe/Nicosia":"Asia/Nicosia","Asia/Tbilisi":[["2:59:16","-","LMT","1880"],["2:59:16","-","TBMT","1924","May","2",""],["3:00","-","TBIT","1957","Mar",""],["4:00","RussiaAsia","TBI%sT","1991","Mar","31","2:00s"],["3:00","1:00","TBIST","1991","Apr","9",""],["3:00","RussiaAsia","GE%sT","1992",""],["3:00","E-EurAsia","GE%sT","1994","Sep","lastSun"],["4:00","E-EurAsia","GE%sT","1996","Oct","lastSun"],["4:00","1:00","GEST","1997","Mar","lastSun"],["4:00","E-EurAsia","GE%sT","2004","Jun","27"],["3:00","RussiaAsia","GE%sT","2005","Mar","lastSun","2:00"],["4:00","-","GET"]],"Asia/Dili":[["8:22:20","-","LMT","1912"],["8:00","-","TLT","1942","Feb","21","23:00",""],["9:00","-","JST","1945","Sep","23"],["9:00","-","TLT","1976","May","3"],["8:00","-","CIT","2000","Sep","17","00:00"],["9:00","-","TLT"]],"Asia/Kolkata":[["5:53:28","-","LMT","1880",""],["5:53:20","-","HMT","1941","Oct",""],["6:30","-","BURT","1942","May","15",""],["5:30","-","IST","1942","Sep"],["5:30","1:00","IST","1945","Oct","15"],["5:30","-","IST"]],"Asia/Jakarta":[["7:07:12","-","LMT","1867","Aug","10"],["7:07:12","-","JMT","1923","Dec","31","23:47:12",""],["7:20","-","JAVT","1932","Nov",""],["7:30","-","WIT","1942","Mar","23"],["9:00","-","JST","1945","Sep","23"],["7:30","-","WIT","1948","May"],["8:00","-","WIT","1950","May"],["7:30","-","WIT","1964"],["7:00","-","WIT"]],"Asia/Pontianak":[["7:17:20","-","LMT","1908","May"],["7:17:20","-","PMT","1932","Nov",""],["7:30","-","WIT","1942","Jan","29"],["9:00","-","JST","1945","Sep","23"],["7:30","-","WIT","1948","May"],["8:00","-","WIT","1950","May"],["7:30","-","WIT","1964"],["8:00","-","CIT","1988","Jan","1"],["7:00","-","WIT"]],"Asia/Makassar":[["7:57:36","-","LMT","1920"],["7:57:36","-","MMT","1932","Nov",""],["8:00","-","CIT","1942","Feb","9"],["9:00","-","JST","1945","Sep","23"],["8:00","-","CIT"]],"Asia/Jayapura":[["9:22:48","-","LMT","1932","Nov"],["9:00","-","EIT","1944","Sep","1"],["9:30","-","CST","1964"],["9:00","-","EIT"]],"Asia/Tehran":[["3:25:44","-","LMT","1916"],["3:25:44","-","TMT","1946",""],["3:30","-","IRST","1977","Nov"],["4:00","Iran","IR%sT","1979"],["3:30","Iran","IR%sT"]],"Asia/Baghdad":[["2:57:40","-","LMT","1890"],["2:57:36","-","BMT","1918",""],["3:00","-","AST","1982","May"],["3:00","Iraq","A%sT"]],"Asia/Jerusalem":[["2:20:56","-","LMT","1880"],["2:20:40","-","JMT","1918",""],["2:00","Zion","I%sT"]],"Asia/Tokyo":[["9:18:59","-","LMT","1887","Dec","31","15:00u"],["9:00","-","JST","1896"],["9:00","-","CJT","1938"],["9:00","Japan","J%sT"]],"Asia/Amman":[["2:23:44","-","LMT","1931"],["2:00","Jordan","EE%sT"]],"Asia/Almaty":[["5:07:48","-","LMT","1924","May","2",""],["5:00","-","ALMT","1930","Jun","21",""],["6:00","RussiaAsia","ALM%sT","1991"],["6:00","-","ALMT","1992"],["6:00","RussiaAsia","ALM%sT","2005","Mar","15"],["6:00","-","ALMT"]],"Asia/Qyzylorda":[["4:21:52","-","LMT","1924","May","2"],["4:00","-","KIZT","1930","Jun","21",""],["5:00","-","KIZT","1981","Apr","1"],["5:00","1:00","KIZST","1981","Oct","1"],["6:00","-","KIZT","1982","Apr","1"],["5:00","RussiaAsia","KIZ%sT","1991"],["5:00","-","KIZT","1991","Dec","16",""],["5:00","-","QYZT","1992","Jan","19","2:00"],["6:00","RussiaAsia","QYZ%sT","2005","Mar","15"],["6:00","-","QYZT"]],"Asia/Aqtobe":[["3:48:40","-","LMT","1924","May","2"],["4:00","-","AKTT","1930","Jun","21",""],["5:00","-","AKTT","1981","Apr","1"],["5:00","1:00","AKTST","1981","Oct","1"],["6:00","-","AKTT","1982","Apr","1"],["5:00","RussiaAsia","AKT%sT","1991"],["5:00","-","AKTT","1991","Dec","16",""],["5:00","RussiaAsia","AQT%sT","2005","Mar","15",""],["5:00","-","AQTT"]],"Asia/Aqtau":[["3:21:04","-","LMT","1924","May","2"],["4:00","-","FORT","1930","Jun","21",""],["5:00","-","FORT","1963"],["5:00","-","SHET","1981","Oct","1",""],["6:00","-","SHET","1982","Apr","1"],["5:00","RussiaAsia","SHE%sT","1991"],["5:00","-","SHET","1991","Dec","16",""],["5:00","RussiaAsia","AQT%sT","1995","Mar","lastSun","2:00",""],["4:00","RussiaAsia","AQT%sT","2005","Mar","15"],["5:00","-","AQTT"]],"Asia/Oral":[["3:25:24","-","LMT","1924","May","2",""],["4:00","-","URAT","1930","Jun","21",""],["5:00","-","URAT","1981","Apr","1"],["5:00","1:00","URAST","1981","Oct","1"],["6:00","-","URAT","1982","Apr","1"],["5:00","RussiaAsia","URA%sT","1989","Mar","26","2:00"],["4:00","RussiaAsia","URA%sT","1991"],["4:00","-","URAT","1991","Dec","16",""],["4:00","RussiaAsia","ORA%sT","2005","Mar","15",""],["5:00","-","ORAT"]],"Asia/Bishkek":[["4:58:24","-","LMT","1924","May","2"],["5:00","-","FRUT","1930","Jun","21",""],["6:00","RussiaAsia","FRU%sT","1991","Mar","31","2:00s"],["5:00","1:00","FRUST","1991","Aug","31","2:00",""],["5:00","Kyrgyz","KG%sT","2005","Aug","12",""],["6:00","-","KGT"]],"Asia/Seoul":[["8:27:52","-","LMT","1890"],["8:30","-","KST","1904","Dec"],["9:00","-","KST","1928"],["8:30","-","KST","1932"],["9:00","-","KST","1954","Mar","21"],["8:00","ROK","K%sT","1961","Aug","10"],["8:30","-","KST","1968","Oct"],["9:00","ROK","K%sT"]],"Asia/Pyongyang":[["8:23:00","-","LMT","1890"],["8:30","-","KST","1904","Dec"],["9:00","-","KST","1928"],["8:30","-","KST","1932"],["9:00","-","KST","1954","Mar","21"],["8:00","-","KST","1961","Aug","10"],["9:00","-","KST"]],"Asia/Kuwait":[["3:11:56","-","LMT","1950"],["3:00","-","AST"]],"Asia/Vientiane":[["6:50:24","-","LMT","1906","Jun","9",""],["7:06:20","-","SMT","1911","Mar","11","0:01",""],["7:00","-","ICT","1912","May"],["8:00","-","ICT","1931","May"],["7:00","-","ICT"]],"Asia/Beirut":[["2:22:00","-","LMT","1880"],["2:00","Lebanon","EE%sT"]],"Asia/Kuala_Lumpur":[["6:46:46","-","LMT","1901","Jan","1"],["6:55:25","-","SMT","1905","Jun","1",""],["7:00","-","MALT","1933","Jan","1",""],["7:00","0:20","MALST","1936","Jan","1"],["7:20","-","MALT","1941","Sep","1"],["7:30","-","MALT","1942","Feb","16"],["9:00","-","JST","1945","Sep","12"],["7:30","-","MALT","1982","Jan","1"],["8:00","-","MYT",""]],"Asia/Kuching":[["7:21:20","-","LMT","1926","Mar"],["7:30","-","BORT","1933",""],["8:00","NBorneo","BOR%sT","1942","Feb","16"],["9:00","-","JST","1945","Sep","12"],["8:00","-","BORT","1982","Jan","1"],["8:00","-","MYT"]],"Indian/Maldives":[["4:54:00","-","LMT","1880",""],["4:54:00","-","MMT","1960",""],["5:00","-","MVT",""]],"Asia/Hovd":[["6:06:36","-","LMT","1905","Aug"],["6:00","-","HOVT","1978",""],["7:00","Mongol","HOV%sT"]],"Asia/Ulaanbaatar":[["7:07:32","-","LMT","1905","Aug"],["7:00","-","ULAT","1978",""],["8:00","Mongol","ULA%sT"]],"Asia/Choibalsan":[["7:38:00","-","LMT","1905","Aug"],["7:00","-","ULAT","1978"],["8:00","-","ULAT","1983","Apr"],["9:00","Mongol","CHO%sT","2008","Mar","31",""],["8:00","Mongol","CHO%sT"]],"Asia/Kathmandu":[["5:41:16","-","LMT","1920"],["5:30","-","IST","1986"],["5:45","-","NPT",""]],"Asia/Muscat":[["3:54:20","-","LMT","1920"],["4:00","-","GST"]],"Asia/Karachi":[["4:28:12","-","LMT","1907"],["5:30","-","IST","1942","Sep"],["5:30","1:00","IST","1945","Oct","15"],["5:30","-","IST","1951","Sep","30"],["5:00","-","KART","1971","Mar","26",""],["5:00","Pakistan","PK%sT",""]],"Asia/Gaza":[["2:17:52","-","LMT","1900","Oct"],["2:00","Zion","EET","1948","May","15"],["2:00","EgyptAsia","EE%sT","1967","Jun","5"],["2:00","Zion","I%sT","1996"],["2:00","Jordan","EE%sT","1999"],["2:00","Palestine","EE%sT"]],"Asia/Manila":[["-15:56:00","-","LMT","1844","Dec","31"],["8:04:00","-","LMT","1899","May","11"],["8:00","Phil","PH%sT","1942","May"],["9:00","-","JST","1944","Nov"],["8:00","Phil","PH%sT"]],"Asia/Qatar":[["3:26:08","-","LMT","1920",""],["4:00","-","GST","1972","Jun"],["3:00","-","AST"]],"Asia/Riyadh":[["3:06:52","-","LMT","1950"],["3:00","-","AST"]],"Asia/Singapore":[["6:55:25","-","LMT","1901","Jan","1"],["6:55:25","-","SMT","1905","Jun","1",""],["7:00","-","MALT","1933","Jan","1",""],["7:00","0:20","MALST","1936","Jan","1"],["7:20","-","MALT","1941","Sep","1"],["7:30","-","MALT","1942","Feb","16"],["9:00","-","JST","1945","Sep","12"],["7:30","-","MALT","1965","Aug","9",""],["7:30","-","SGT","1982","Jan","1",""],["8:00","-","SGT"]],"Asia/Colombo":[["5:19:24","-","LMT","1880"],["5:19:32","-","MMT","1906",""],["5:30","-","IST","1942","Jan","5"],["5:30","0:30","IHST","1942","Sep"],["5:30","1:00","IST","1945","Oct","16","2:00"],["5:30","-","IST","1996","May","25","0:00"],["6:30","-","LKT","1996","Oct","26","0:30"],["6:00","-","LKT","2006","Apr","15","0:30"],["5:30","-","IST"]],"Asia/Damascus":[["2:25:12","-","LMT","1920",""],["2:00","Syria","EE%sT"]],"Asia/Dushanbe":[["4:35:12","-","LMT","1924","May","2"],["5:00","-","DUST","1930","Jun","21",""],["6:00","RussiaAsia","DUS%sT","1991","Mar","31","2:00s"],["5:00","1:00","DUSST","1991","Sep","9","2:00s"],["5:00","-","TJT",""]],"Asia/Bangkok":[["6:42:04","-","LMT","1880"],["6:42:04","-","BMT","1920","Apr",""],["7:00","-","ICT"]],"Asia/Ashgabat":[["3:53:32","-","LMT","1924","May","2",""],["4:00","-","ASHT","1930","Jun","21",""],["5:00","RussiaAsia","ASH%sT","1991","Mar","31","2:00"],["4:00","RussiaAsia","ASH%sT","1991","Oct","27",""],["4:00","RussiaAsia","TM%sT","1992","Jan","19","2:00"],["5:00","-","TMT"]],"Asia/Dubai":[["3:41:12","-","LMT","1920"],["4:00","-","GST"]],"Asia/Samarkand":[["4:27:12","-","LMT","1924","May","2"],["4:00","-","SAMT","1930","Jun","21",""],["5:00","-","SAMT","1981","Apr","1"],["5:00","1:00","SAMST","1981","Oct","1"],["6:00","-","TAST","1982","Apr","1",""],["5:00","RussiaAsia","SAM%sT","1991","Sep","1",""],["5:00","RussiaAsia","UZ%sT","1992"],["5:00","-","UZT"]],"Asia/Tashkent":[["4:37:12","-","LMT","1924","May","2"],["5:00","-","TAST","1930","Jun","21",""],["6:00","RussiaAsia","TAS%sT","1991","Mar","31","2:00"],["5:00","RussiaAsia","TAS%sT","1991","Sep","1",""],["5:00","RussiaAsia","UZ%sT","1992"],["5:00","-","UZT"]],"Asia/Ho_Chi_Minh":[["7:06:40","-","LMT","1906","Jun","9"],["7:06:20","-","SMT","1911","Mar","11","0:01",""],["7:00","-","ICT","1912","May"],["8:00","-","ICT","1931","May"],["7:00","-","ICT"]],"Asia/Aden":[["3:00:48","-","LMT","1950"],["3:00","-","AST"]]};
timezoneJS.timezone.rules = {"US":[["1918","1919","-","Mar","lastSun","2:00","1:00","D"],["1918","1919","-","Oct","lastSun","2:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","30","2:00","0","S"],["1967","2006","-","Oct","lastSun","2:00","0","S"],["1967","1973","-","Apr","lastSun","2:00","1:00","D"],["1974","only","-","Jan","6","2:00","1:00","D"],["1975","only","-","Feb","23","2:00","1:00","D"],["1976","1986","-","Apr","lastSun","2:00","1:00","D"],["1987","2006","-","Apr","Sun>=1","2:00","1:00","D"],["2007","max","-","Mar","Sun>=8","2:00","1:00","D"],["2007","max","-","Nov","Sun>=1","2:00","0","S"]],"NYC":[["1920","only","-","Mar","lastSun","2:00","1:00","D"],["1920","only","-","Oct","lastSun","2:00","0","S"],["1921","1966","-","Apr","lastSun","2:00","1:00","D"],["1921","1954","-","Sep","lastSun","2:00","0","S"],["1955","1966","-","Oct","lastSun","2:00","0","S"]],"Chicago":[["1920","only","-","Jun","13","2:00","1:00","D"],["1920","1921","-","Oct","lastSun","2:00","0","S"],["1921","only","-","Mar","lastSun","2:00","1:00","D"],["1922","1966","-","Apr","lastSun","2:00","1:00","D"],["1922","1954","-","Sep","lastSun","2:00","0","S"],["1955","1966","-","Oct","lastSun","2:00","0","S"]],"Denver":[["1920","1921","-","Mar","lastSun","2:00","1:00","D"],["1920","only","-","Oct","lastSun","2:00","0","S"],["1921","only","-","May","22","2:00","0","S"],["1965","1966","-","Apr","lastSun","2:00","1:00","D"],["1965","1966","-","Oct","lastSun","2:00","0","S"]],"CA":[["1948","only","-","Mar","14","2:00","1:00","D"],["1949","only","-","Jan","1","2:00","0","S"],["1950","1966","-","Apr","lastSun","2:00","1:00","D"],["1950","1961","-","Sep","lastSun","2:00","0","S"],["1962","1966","-","Oct","lastSun","2:00","0","S"]],"Indianapolis":[["1941","only","-","Jun","22","2:00","1:00","D"],["1941","1954","-","Sep","lastSun","2:00","0","S"],["1946","1954","-","Apr","lastSun","2:00","1:00","D"]],"Marengo":[["1951","only","-","Apr","lastSun","2:00","1:00","D"],["1951","only","-","Sep","lastSun","2:00","0","S"],["1954","1960","-","Apr","lastSun","2:00","1:00","D"],["1954","1960","-","Sep","lastSun","2:00","0","S"]],"Vincennes":[["1946","only","-","Apr","lastSun","2:00","1:00","D"],["1946","only","-","Sep","lastSun","2:00","0","S"],["1953","1954","-","Apr","lastSun","2:00","1:00","D"],["1953","1959","-","Sep","lastSun","2:00","0","S"],["1955","only","-","May","1","0:00","1:00","D"],["1956","1963","-","Apr","lastSun","2:00","1:00","D"],["1960","only","-","Oct","lastSun","2:00","0","S"],["1961","only","-","Sep","lastSun","2:00","0","S"],["1962","1963","-","Oct","lastSun","2:00","0","S"]],"Perry":[["1946","only","-","Apr","lastSun","2:00","1:00","D"],["1946","only","-","Sep","lastSun","2:00","0","S"],["1953","1954","-","Apr","lastSun","2:00","1:00","D"],["1953","1959","-","Sep","lastSun","2:00","0","S"],["1955","only","-","May","1","0:00","1:00","D"],["1956","1963","-","Apr","lastSun","2:00","1:00","D"],["1960","only","-","Oct","lastSun","2:00","0","S"],["1961","only","-","Sep","lastSun","2:00","0","S"],["1962","1963","-","Oct","lastSun","2:00","0","S"]],"Pike":[["1955","only","-","May","1","0:00","1:00","D"],["1955","1960","-","Sep","lastSun","2:00","0","S"],["1956","1964","-","Apr","lastSun","2:00","1:00","D"],["1961","1964","-","Oct","lastSun","2:00","0","S"]],"Starke":[["1947","1961","-","Apr","lastSun","2:00","1:00","D"],["1947","1954","-","Sep","lastSun","2:00","0","S"],["1955","1956","-","Oct","lastSun","2:00","0","S"],["1957","1958","-","Sep","lastSun","2:00","0","S"],["1959","1961","-","Oct","lastSun","2:00","0","S"]],"Pulaski":[["1946","1960","-","Apr","lastSun","2:00","1:00","D"],["1946","1954","-","Sep","lastSun","2:00","0","S"],["1955","1956","-","Oct","lastSun","2:00","0","S"],["1957","1960","-","Sep","lastSun","2:00","0","S"]],"Louisville":[["1921","only","-","May","1","2:00","1:00","D"],["1921","only","-","Sep","1","2:00","0","S"],["1941","1961","-","Apr","lastSun","2:00","1:00","D"],["1941","only","-","Sep","lastSun","2:00","0","S"],["1946","only","-","Jun","2","2:00","0","S"],["1950","1955","-","Sep","lastSun","2:00","0","S"],["1956","1960","-","Oct","lastSun","2:00","0","S"]],"Detroit":[["1948","only","-","Apr","lastSun","2:00","1:00","D"],["1948","only","-","Sep","lastSun","2:00","0","S"],["1967","only","-","Jun","14","2:00","1:00","D"],["1967","only","-","Oct","lastSun","2:00","0","S"]],"Menominee":[["1946","only","-","Apr","lastSun","2:00","1:00","D"],["1946","only","-","Sep","lastSun","2:00","0","S"],["1966","only","-","Apr","lastSun","2:00","1:00","D"],["1966","only","-","Oct","lastSun","2:00","0","S"]],"Canada":[["1918","only","-","Apr","14","2:00","1:00","D"],["1918","only","-","Oct","31","2:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","30","2:00","0","S"],["1974","1986","-","Apr","lastSun","2:00","1:00","D"],["1974","2006","-","Oct","lastSun","2:00","0","S"],["1987","2006","-","Apr","Sun>=1","2:00","1:00","D"],["2007","max","-","Mar","Sun>=8","2:00","1:00","D"],["2007","max","-","Nov","Sun>=1","2:00","0","S"]],"StJohns":[["1917","only","-","Apr","8","2:00","1:00","D"],["1917","only","-","Sep","17","2:00","0","S"],["1919","only","-","May","5","23:00","1:00","D"],["1919","only","-","Aug","12","23:00","0","S"],["1920","1935","-","May","Sun>=1","23:00","1:00","D"],["1920","1935","-","Oct","lastSun","23:00","0","S"],["1936","1941","-","May","Mon>=9","0:00","1:00","D"],["1936","1941","-","Oct","Mon>=2","0:00","0","S"],["1946","1950","-","May","Sun>=8","2:00","1:00","D"],["1946","1950","-","Oct","Sun>=2","2:00","0","S"],["1951","1986","-","Apr","lastSun","2:00","1:00","D"],["1951","1959","-","Sep","lastSun","2:00","0","S"],["1960","1986","-","Oct","lastSun","2:00","0","S"],["1987","only","-","Apr","Sun>=1","0:01","1:00","D"],["1987","2006","-","Oct","lastSun","0:01","0","S"],["1988","only","-","Apr","Sun>=1","0:01","2:00","DD"],["1989","2006","-","Apr","Sun>=1","0:01","1:00","D"],["2007","max","-","Mar","Sun>=8","0:01","1:00","D"],["2007","max","-","Nov","Sun>=1","0:01","0","S"]],"Halifax":[["1916","only","-","Apr","1","0:00","1:00","D"],["1916","only","-","Oct","1","0:00","0","S"],["1920","only","-","May","9","0:00","1:00","D"],["1920","only","-","Aug","29","0:00","0","S"],["1921","only","-","May","6","0:00","1:00","D"],["1921","1922","-","Sep","5","0:00","0","S"],["1922","only","-","Apr","30","0:00","1:00","D"],["1923","1925","-","May","Sun>=1","0:00","1:00","D"],["1923","only","-","Sep","4","0:00","0","S"],["1924","only","-","Sep","15","0:00","0","S"],["1925","only","-","Sep","28","0:00","0","S"],["1926","only","-","May","16","0:00","1:00","D"],["1926","only","-","Sep","13","0:00","0","S"],["1927","only","-","May","1","0:00","1:00","D"],["1927","only","-","Sep","26","0:00","0","S"],["1928","1931","-","May","Sun>=8","0:00","1:00","D"],["1928","only","-","Sep","9","0:00","0","S"],["1929","only","-","Sep","3","0:00","0","S"],["1930","only","-","Sep","15","0:00","0","S"],["1931","1932","-","Sep","Mon>=24","0:00","0","S"],["1932","only","-","May","1","0:00","1:00","D"],["1933","only","-","Apr","30","0:00","1:00","D"],["1933","only","-","Oct","2","0:00","0","S"],["1934","only","-","May","20","0:00","1:00","D"],["1934","only","-","Sep","16","0:00","0","S"],["1935","only","-","Jun","2","0:00","1:00","D"],["1935","only","-","Sep","30","0:00","0","S"],["1936","only","-","Jun","1","0:00","1:00","D"],["1936","only","-","Sep","14","0:00","0","S"],["1937","1938","-","May","Sun>=1","0:00","1:00","D"],["1937","1941","-","Sep","Mon>=24","0:00","0","S"],["1939","only","-","May","28","0:00","1:00","D"],["1940","1941","-","May","Sun>=1","0:00","1:00","D"],["1946","1949","-","Apr","lastSun","2:00","1:00","D"],["1946","1949","-","Sep","lastSun","2:00","0","S"],["1951","1954","-","Apr","lastSun","2:00","1:00","D"],["1951","1954","-","Sep","lastSun","2:00","0","S"],["1956","1959","-","Apr","lastSun","2:00","1:00","D"],["1956","1959","-","Sep","lastSun","2:00","0","S"],["1962","1973","-","Apr","lastSun","2:00","1:00","D"],["1962","1973","-","Oct","lastSun","2:00","0","S"]],"Moncton":[["1933","1935","-","Jun","Sun>=8","1:00","1:00","D"],["1933","1935","-","Sep","Sun>=8","1:00","0","S"],["1936","1938","-","Jun","Sun>=1","1:00","1:00","D"],["1936","1938","-","Sep","Sun>=1","1:00","0","S"],["1939","only","-","May","27","1:00","1:00","D"],["1939","1941","-","Sep","Sat>=21","1:00","0","S"],["1940","only","-","May","19","1:00","1:00","D"],["1941","only","-","May","4","1:00","1:00","D"],["1946","1972","-","Apr","lastSun","2:00","1:00","D"],["1946","1956","-","Sep","lastSun","2:00","0","S"],["1957","1972","-","Oct","lastSun","2:00","0","S"],["1993","2006","-","Apr","Sun>=1","0:01","1:00","D"],["1993","2006","-","Oct","lastSun","0:01","0","S"]],"Mont":[["1917","only","-","Mar","25","2:00","1:00","D"],["1917","only","-","Apr","24","0:00","0","S"],["1919","only","-","Mar","31","2:30","1:00","D"],["1919","only","-","Oct","25","2:30","0","S"],["1920","only","-","May","2","2:30","1:00","D"],["1920","1922","-","Oct","Sun>=1","2:30","0","S"],["1921","only","-","May","1","2:00","1:00","D"],["1922","only","-","Apr","30","2:00","1:00","D"],["1924","only","-","May","17","2:00","1:00","D"],["1924","1926","-","Sep","lastSun","2:30","0","S"],["1925","1926","-","May","Sun>=1","2:00","1:00","D"],["1927","only","-","May","1","0:00","1:00","D"],["1927","1932","-","Sep","lastSun","0:00","0","S"],["1928","1931","-","Apr","lastSun","0:00","1:00","D"],["1932","only","-","May","1","0:00","1:00","D"],["1933","1940","-","Apr","lastSun","0:00","1:00","D"],["1933","only","-","Oct","1","0:00","0","S"],["1934","1939","-","Sep","lastSun","0:00","0","S"],["1946","1973","-","Apr","lastSun","2:00","1:00","D"],["1945","1948","-","Sep","lastSun","2:00","0","S"],["1949","1950","-","Oct","lastSun","2:00","0","S"],["1951","1956","-","Sep","lastSun","2:00","0","S"],["1957","1973","-","Oct","lastSun","2:00","0","S"]],"Toronto":[["1919","only","-","Mar","30","23:30","1:00","D"],["1919","only","-","Oct","26","0:00","0","S"],["1920","only","-","May","2","2:00","1:00","D"],["1920","only","-","Sep","26","0:00","0","S"],["1921","only","-","May","15","2:00","1:00","D"],["1921","only","-","Sep","15","2:00","0","S"],["1922","1923","-","May","Sun>=8","2:00","1:00","D"],["1922","1926","-","Sep","Sun>=15","2:00","0","S"],["1924","1927","-","May","Sun>=1","2:00","1:00","D"],["1927","1932","-","Sep","lastSun","2:00","0","S"],["1928","1931","-","Apr","lastSun","2:00","1:00","D"],["1932","only","-","May","1","2:00","1:00","D"],["1933","1940","-","Apr","lastSun","2:00","1:00","D"],["1933","only","-","Oct","1","2:00","0","S"],["1934","1939","-","Sep","lastSun","2:00","0","S"],["1945","1946","-","Sep","lastSun","2:00","0","S"],["1946","only","-","Apr","lastSun","2:00","1:00","D"],["1947","1949","-","Apr","lastSun","0:00","1:00","D"],["1947","1948","-","Sep","lastSun","0:00","0","S"],["1949","only","-","Nov","lastSun","0:00","0","S"],["1950","1973","-","Apr","lastSun","2:00","1:00","D"],["1950","only","-","Nov","lastSun","2:00","0","S"],["1951","1956","-","Sep","lastSun","2:00","0","S"],["1957","1973","-","Oct","lastSun","2:00","0","S"]],"Winn":[["1916","only","-","Apr","23","0:00","1:00","D"],["1916","only","-","Sep","17","0:00","0","S"],["1918","only","-","Apr","14","2:00","1:00","D"],["1918","only","-","Oct","31","2:00","0","S"],["1937","only","-","May","16","2:00","1:00","D"],["1937","only","-","Sep","26","2:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","lastSun","2:00","0","S"],["1946","only","-","May","12","2:00","1:00","D"],["1946","only","-","Oct","13","2:00","0","S"],["1947","1949","-","Apr","lastSun","2:00","1:00","D"],["1947","1949","-","Sep","lastSun","2:00","0","S"],["1950","only","-","May","1","2:00","1:00","D"],["1950","only","-","Sep","30","2:00","0","S"],["1951","1960","-","Apr","lastSun","2:00","1:00","D"],["1951","1958","-","Sep","lastSun","2:00","0","S"],["1959","only","-","Oct","lastSun","2:00","0","S"],["1960","only","-","Sep","lastSun","2:00","0","S"],["1963","only","-","Apr","lastSun","2:00","1:00","D"],["1963","only","-","Sep","22","2:00","0","S"],["1966","1986","-","Apr","lastSun","2:00s","1:00","D"],["1966","2005","-","Oct","lastSun","2:00s","0","S"],["1987","2005","-","Apr","Sun>=1","2:00s","1:00","D"]],"Regina":[["1918","only","-","Apr","14","2:00","1:00","D"],["1918","only","-","Oct","31","2:00","0","S"],["1930","1934","-","May","Sun>=1","0:00","1:00","D"],["1930","1934","-","Oct","Sun>=1","0:00","0","S"],["1937","1941","-","Apr","Sun>=8","0:00","1:00","D"],["1937","only","-","Oct","Sun>=8","0:00","0","S"],["1938","only","-","Oct","Sun>=1","0:00","0","S"],["1939","1941","-","Oct","Sun>=8","0:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","lastSun","2:00","0","S"],["1946","only","-","Apr","Sun>=8","2:00","1:00","D"],["1946","only","-","Oct","Sun>=8","2:00","0","S"],["1947","1957","-","Apr","lastSun","2:00","1:00","D"],["1947","1957","-","Sep","lastSun","2:00","0","S"],["1959","only","-","Apr","lastSun","2:00","1:00","D"],["1959","only","-","Oct","lastSun","2:00","0","S"]],"Swift":[["1957","only","-","Apr","lastSun","2:00","1:00","D"],["1957","only","-","Oct","lastSun","2:00","0","S"],["1959","1961","-","Apr","lastSun","2:00","1:00","D"],["1959","only","-","Oct","lastSun","2:00","0","S"],["1960","1961","-","Sep","lastSun","2:00","0","S"]],"Edm":[["1918","1919","-","Apr","Sun>=8","2:00","1:00","D"],["1918","only","-","Oct","31","2:00","0","S"],["1919","only","-","May","27","2:00","0","S"],["1920","1923","-","Apr","lastSun","2:00","1:00","D"],["1920","only","-","Oct","lastSun","2:00","0","S"],["1921","1923","-","Sep","lastSun","2:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","lastSun","2:00","0","S"],["1947","only","-","Apr","lastSun","2:00","1:00","D"],["1947","only","-","Sep","lastSun","2:00","0","S"],["1967","only","-","Apr","lastSun","2:00","1:00","D"],["1967","only","-","Oct","lastSun","2:00","0","S"],["1969","only","-","Apr","lastSun","2:00","1:00","D"],["1969","only","-","Oct","lastSun","2:00","0","S"],["1972","1986","-","Apr","lastSun","2:00","1:00","D"],["1972","2006","-","Oct","lastSun","2:00","0","S"]],"Vanc":[["1918","only","-","Apr","14","2:00","1:00","D"],["1918","only","-","Oct","31","2:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","30","2:00","0","S"],["1946","1986","-","Apr","lastSun","2:00","1:00","D"],["1946","only","-","Oct","13","2:00","0","S"],["1947","1961","-","Sep","lastSun","2:00","0","S"],["1962","2006","-","Oct","lastSun","2:00","0","S"]],"NT_YK":[["1918","only","-","Apr","14","2:00","1:00","D"],["1918","only","-","Oct","27","2:00","0","S"],["1919","only","-","May","25","2:00","1:00","D"],["1919","only","-","Nov","1","0:00","0","S"],["1942","only","-","Feb","9","2:00","1:00","W",""],["1945","only","-","Aug","14","23:00u","1:00","P",""],["1945","only","-","Sep","30","2:00","0","S"],["1965","only","-","Apr","lastSun","0:00","2:00","DD"],["1965","only","-","Oct","lastSun","2:00","0","S"],["1980","1986","-","Apr","lastSun","2:00","1:00","D"],["1980","2006","-","Oct","lastSun","2:00","0","S"],["1987","2006","-","Apr","Sun>=1","2:00","1:00","D"]],"Resolute":[["2006","max","-","Nov","Sun>=1","2:00","0","ES"],["2007","max","-","Mar","Sun>=8","2:00","0","CD"]],"Mexico":[["1939","only","-","Feb","5","0:00","1:00","D"],["1939","only","-","Jun","25","0:00","0","S"],["1940","only","-","Dec","9","0:00","1:00","D"],["1941","only","-","Apr","1","0:00","0","S"],["1943","only","-","Dec","16","0:00","1:00","W",""],["1944","only","-","May","1","0:00","0","S"],["1950","only","-","Feb","12","0:00","1:00","D"],["1950","only","-","Jul","30","0:00","0","S"],["1996","2000","-","Apr","Sun>=1","2:00","1:00","D"],["1996","2000","-","Oct","lastSun","2:00","0","S"],["2001","only","-","May","Sun>=1","2:00","1:00","D"],["2001","only","-","Sep","lastSun","2:00","0","S"],["2002","max","-","Apr","Sun>=1","2:00","1:00","D"],["2002","max","-","Oct","lastSun","2:00","0","S"]],"Bahamas":[["1964","1975","-","Oct","lastSun","2:00","0","S"],["1964","1975","-","Apr","lastSun","2:00","1:00","D"]],"Barb":[["1977","only","-","Jun","12","2:00","1:00","D"],["1977","1978","-","Oct","Sun>=1","2:00","0","S"],["1978","1980","-","Apr","Sun>=15","2:00","1:00","D"],["1979","only","-","Sep","30","2:00","0","S"],["1980","only","-","Sep","25","2:00","0","S"]],"Belize":[["1918","1942","-","Oct","Sun>=2","0:00","0:30","HD"],["1919","1943","-","Feb","Sun>=9","0:00","0","S"],["1973","only","-","Dec","5","0:00","1:00","D"],["1974","only","-","Feb","9","0:00","0","S"],["1982","only","-","Dec","18","0:00","1:00","D"],["1983","only","-","Feb","12","0:00","0","S"]],"CR":[["1979","1980","-","Feb","lastSun","0:00","1:00","D"],["1979","1980","-","Jun","Sun>=1","0:00","0","S"],["1991","1992","-","Jan","Sat>=15","0:00","1:00","D"],["1991","only","-","Jul","1","0:00","0","S"],["1992","only","-","Mar","15","0:00","0","S"]],"Cuba":[["1928","only","-","Jun","10","0:00","1:00","D"],["1928","only","-","Oct","10","0:00","0","S"],["1940","1942","-","Jun","Sun>=1","0:00","1:00","D"],["1940","1942","-","Sep","Sun>=1","0:00","0","S"],["1945","1946","-","Jun","Sun>=1","0:00","1:00","D"],["1945","1946","-","Sep","Sun>=1","0:00","0","S"],["1965","only","-","Jun","1","0:00","1:00","D"],["1965","only","-","Sep","30","0:00","0","S"],["1966","only","-","May","29","0:00","1:00","D"],["1966","only","-","Oct","2","0:00","0","S"],["1967","only","-","Apr","8","0:00","1:00","D"],["1967","1968","-","Sep","Sun>=8","0:00","0","S"],["1968","only","-","Apr","14","0:00","1:00","D"],["1969","1977","-","Apr","lastSun","0:00","1:00","D"],["1969","1971","-","Oct","lastSun","0:00","0","S"],["1972","1974","-","Oct","8","0:00","0","S"],["1975","1977","-","Oct","lastSun","0:00","0","S"],["1978","only","-","May","7","0:00","1:00","D"],["1978","1990","-","Oct","Sun>=8","0:00","0","S"],["1979","1980","-","Mar","Sun>=15","0:00","1:00","D"],["1981","1985","-","May","Sun>=5","0:00","1:00","D"],["1986","1989","-","Mar","Sun>=14","0:00","1:00","D"],["1990","1997","-","Apr","Sun>=1","0:00","1:00","D"],["1991","1995","-","Oct","Sun>=8","0:00s","0","S"],["1996","only","-","Oct","6","0:00s","0","S"],["1997","only","-","Oct","12","0:00s","0","S"],["1998","1999","-","Mar","lastSun","0:00s","1:00","D"],["1998","2003","-","Oct","lastSun","0:00s","0","S"],["2000","2004","-","Apr","Sun>=1","0:00s","1:00","D"],["2006","max","-","Oct","lastSun","0:00s","0","S"],["2007","only","-","Mar","Sun>=8","0:00s","1:00","D"],["2008","only","-","Mar","Sun>=15","0:00s","1:00","D"],["2009","2010","-","Mar","Sun>=8","0:00s","1:00","D"],["2011","only","-","Mar","Sun>=15","0:00s","1:00","D"],["2012","max","-","Mar","Sun>=8","0:00s","1:00","D"]],"DR":[["1966","only","-","Oct","30","0:00","1:00","D"],["1967","only","-","Feb","28","0:00","0","S"],["1969","1973","-","Oct","lastSun","0:00","0:30","HD"],["1970","only","-","Feb","21","0:00","0","S"],["1971","only","-","Jan","20","0:00","0","S"],["1972","1974","-","Jan","21","0:00","0","S"]],"Salv":[["1987","1988","-","May","Sun>=1","0:00","1:00","D"],["1987","1988","-","Sep","lastSun","0:00","0","S"]],"Guat":[["1973","only","-","Nov","25","0:00","1:00","D"],["1974","only","-","Feb","24","0:00","0","S"],["1983","only","-","May","21","0:00","1:00","D"],["1983","only","-","Sep","22","0:00","0","S"],["1991","only","-","Mar","23","0:00","1:00","D"],["1991","only","-","Sep","7","0:00","0","S"],["2006","only","-","Apr","30","0:00","1:00","D"],["2006","only","-","Oct","1","0:00","0","S"]],"Haiti":[["1983","only","-","May","8","0:00","1:00","D"],["1984","1987","-","Apr","lastSun","0:00","1:00","D"],["1983","1987","-","Oct","lastSun","0:00","0","S"],["1988","1997","-","Apr","Sun>=1","1:00s","1:00","D"],["1988","1997","-","Oct","lastSun","1:00s","0","S"],["2005","2006","-","Apr","Sun>=1","0:00","1:00","D"],["2005","2006","-","Oct","lastSun","0:00","0","S"]],"Hond":[["1987","1988","-","May","Sun>=1","0:00","1:00","D"],["1987","1988","-","Sep","lastSun","0:00","0","S"],["2006","only","-","May","Sun>=1","0:00","1:00","D"],["2006","only","-","Aug","Mon>=1","0:00","0","S"]],"Nic":[["1979","1980","-","Mar","Sun>=16","0:00","1:00","D"],["1979","1980","-","Jun","Mon>=23","0:00","0","S"],["2005","only","-","Apr","10","0:00","1:00","D"],["2005","only","-","Oct","Sun>=1","0:00","0","S"],["2006","only","-","Apr","30","2:00","1:00","D"],["2006","only","-","Oct","Sun>=1","1:00","0","S"]],"TC":[["1979","1986","-","Apr","lastSun","2:00","1:00","D"],["1979","2006","-","Oct","lastSun","2:00","0","S"],["1987","2006","-","Apr","Sun>=1","2:00","1:00","D"],["2007","max","-","Mar","Sun>=8","2:00","1:00","D"],["2007","max","-","Nov","Sun>=1","2:00","0","S"]],"EUAsia":[["1981","max","-","Mar","lastSun","1:00u","1:00","S"],["1979","1995","-","Sep","lastSun","1:00u","0","-"],["1996","max","-","Oct","lastSun","1:00u","0","-"]],"E-EurAsia":[["1981","max","-","Mar","lastSun","0:00","1:00","S"],["1979","1995","-","Sep","lastSun","0:00","0","-"],["1996","max","-","Oct","lastSun","0:00","0","-"]],"RussiaAsia":[["1981","1984","-","Apr","1","0:00","1:00","S"],["1981","1983","-","Oct","1","0:00","0","-"],["1984","1991","-","Sep","lastSun","2:00s","0","-"],["1985","1991","-","Mar","lastSun","2:00s","1:00","S"],["1992","only","-","Mar","lastSat","23:00","1:00","S"],["1992","only","-","Sep","lastSat","23:00","0","-"],["1993","max","-","Mar","lastSun","2:00s","1:00","S"],["1993","1995","-","Sep","lastSun","2:00s","0","-"],["1996","max","-","Oct","lastSun","2:00s","0","-"]],"Azer":[["1997","max","-","Mar","lastSun","4:00","1:00","S"],["1997","max","-","Oct","lastSun","5:00","0","-"]],"Dhaka":[["2009","only","-","Jun","19","23:00","1:00","S"],["2009","only","-","Dec","31","23:59","0","-"]],"Shang":[["1940","only","-","Jun","3","0:00","1:00","D"],["1940","1941","-","Oct","1","0:00","0","S"],["1941","only","-","Mar","16","0:00","1:00","D"]],"PRC":[["1986","only","-","May","4","0:00","1:00","D"],["1986","1991","-","Sep","Sun>=11","0:00","0","S"],["1987","1991","-","Apr","Sun>=10","0:00","1:00","D"]],"HK":[["1941","only","-","Apr","1","3:30","1:00","S"],["1941","only","-","Sep","30","3:30","0","-"],["1946","only","-","Apr","20","3:30","1:00","S"],["1946","only","-","Dec","1","3:30","0","-"],["1947","only","-","Apr","13","3:30","1:00","S"],["1947","only","-","Dec","30","3:30","0","-"],["1948","only","-","May","2","3:30","1:00","S"],["1948","1951","-","Oct","lastSun","3:30","0","-"],["1952","only","-","Oct","25","3:30","0","-"],["1949","1953","-","Apr","Sun>=1","3:30","1:00","S"],["1953","only","-","Nov","1","3:30","0","-"],["1954","1964","-","Mar","Sun>=18","3:30","1:00","S"],["1954","only","-","Oct","31","3:30","0","-"],["1955","1964","-","Nov","Sun>=1","3:30","0","-"],["1965","1976","-","Apr","Sun>=16","3:30","1:00","S"],["1965","1976","-","Oct","Sun>=16","3:30","0","-"],["1973","only","-","Dec","30","3:30","1:00","S"],["1979","only","-","May","Sun>=8","3:30","1:00","S"],["1979","only","-","Oct","Sun>=16","3:30","0","-"]],"Taiwan":[["1945","1951","-","May","1","0:00","1:00","D"],["1945","1951","-","Oct","1","0:00","0","S"],["1952","only","-","Mar","1","0:00","1:00","D"],["1952","1954","-","Nov","1","0:00","0","S"],["1953","1959","-","Apr","1","0:00","1:00","D"],["1955","1961","-","Oct","1","0:00","0","S"],["1960","1961","-","Jun","1","0:00","1:00","D"],["1974","1975","-","Apr","1","0:00","1:00","D"],["1974","1975","-","Oct","1","0:00","0","S"],["1979","only","-","Jun","30","0:00","1:00","D"],["1979","only","-","Sep","30","0:00","0","S"]],"Macau":[["1961","1962","-","Mar","Sun>=16","3:30","1:00","S"],["1961","1964","-","Nov","Sun>=1","3:30","0","-"],["1963","only","-","Mar","Sun>=16","0:00","1:00","S"],["1964","only","-","Mar","Sun>=16","3:30","1:00","S"],["1965","only","-","Mar","Sun>=16","0:00","1:00","S"],["1965","only","-","Oct","31","0:00","0","-"],["1966","1971","-","Apr","Sun>=16","3:30","1:00","S"],["1966","1971","-","Oct","Sun>=16","3:30","0","-"],["1972","1974","-","Apr","Sun>=15","0:00","1:00","S"],["1972","1973","-","Oct","Sun>=15","0:00","0","-"],["1974","1977","-","Oct","Sun>=15","3:30","0","-"],["1975","1977","-","Apr","Sun>=15","3:30","1:00","S"],["1978","1980","-","Apr","Sun>=15","0:00","1:00","S"],["1978","1980","-","Oct","Sun>=15","0:00","0","-"]],"Cyprus":[["1975","only","-","Apr","13","0:00","1:00","S"],["1975","only","-","Oct","12","0:00","0","-"],["1976","only","-","May","15","0:00","1:00","S"],["1976","only","-","Oct","11","0:00","0","-"],["1977","1980","-","Apr","Sun>=1","0:00","1:00","S"],["1977","only","-","Sep","25","0:00","0","-"],["1978","only","-","Oct","2","0:00","0","-"],["1979","1997","-","Sep","lastSun","0:00","0","-"],["1981","1998","-","Mar","lastSun","0:00","1:00","S"]],"Iran":[["1978","1980","-","Mar","21","0:00","1:00","D"],["1978","only","-","Oct","21","0:00","0","S"],["1979","only","-","Sep","19","0:00","0","S"],["1980","only","-","Sep","23","0:00","0","S"],["1991","only","-","May","3","0:00","1:00","D"],["1992","1995","-","Mar","22","0:00","1:00","D"],["1991","1995","-","Sep","22","0:00","0","S"],["1996","only","-","Mar","21","0:00","1:00","D"],["1996","only","-","Sep","21","0:00","0","S"],["1997","1999","-","Mar","22","0:00","1:00","D"],["1997","1999","-","Sep","22","0:00","0","S"],["2000","only","-","Mar","21","0:00","1:00","D"],["2000","only","-","Sep","21","0:00","0","S"],["2001","2003","-","Mar","22","0:00","1:00","D"],["2001","2003","-","Sep","22","0:00","0","S"],["2004","only","-","Mar","21","0:00","1:00","D"],["2004","only","-","Sep","21","0:00","0","S"],["2005","only","-","Mar","22","0:00","1:00","D"],["2005","only","-","Sep","22","0:00","0","S"],["2008","only","-","Mar","21","0:00","1:00","D"],["2008","only","-","Sep","21","0:00","0","S"],["2009","2011","-","Mar","22","0:00","1:00","D"],["2009","2011","-","Sep","22","0:00","0","S"],["2012","only","-","Mar","21","0:00","1:00","D"],["2012","only","-","Sep","21","0:00","0","S"],["2013","2015","-","Mar","22","0:00","1:00","D"],["2013","2015","-","Sep","22","0:00","0","S"],["2016","only","-","Mar","21","0:00","1:00","D"],["2016","only","-","Sep","21","0:00","0","S"],["2017","2019","-","Mar","22","0:00","1:00","D"],["2017","2019","-","Sep","22","0:00","0","S"],["2020","only","-","Mar","21","0:00","1:00","D"],["2020","only","-","Sep","21","0:00","0","S"],["2021","2023","-","Mar","22","0:00","1:00","D"],["2021","2023","-","Sep","22","0:00","0","S"],["2024","only","-","Mar","21","0:00","1:00","D"],["2024","only","-","Sep","21","0:00","0","S"],["2025","2027","-","Mar","22","0:00","1:00","D"],["2025","2027","-","Sep","22","0:00","0","S"],["2028","2029","-","Mar","21","0:00","1:00","D"],["2028","2029","-","Sep","21","0:00","0","S"],["2030","2031","-","Mar","22","0:00","1:00","D"],["2030","2031","-","Sep","22","0:00","0","S"],["2032","2033","-","Mar","21","0:00","1:00","D"],["2032","2033","-","Sep","21","0:00","0","S"],["2034","2035","-","Mar","22","0:00","1:00","D"],["2034","2035","-","Sep","22","0:00","0","S"],["2036","2037","-","Mar","21","0:00","1:00","D"],["2036","2037","-","Sep","21","0:00","0","S"]],"Iraq":[["1982","only","-","May","1","0:00","1:00","D"],["1982","1984","-","Oct","1","0:00","0","S"],["1983","only","-","Mar","31","0:00","1:00","D"],["1984","1985","-","Apr","1","0:00","1:00","D"],["1985","1990","-","Sep","lastSun","1:00s","0","S"],["1986","1990","-","Mar","lastSun","1:00s","1:00","D"],["1991","2007","-","Apr","1","3:00s","1:00","D"],["1991","2007","-","Oct","1","3:00s","0","S"]],"Zion":[["1940","only","-","Jun","1","0:00","1:00","D"],["1942","1944","-","Nov","1","0:00","0","S"],["1943","only","-","Apr","1","2:00","1:00","D"],["1944","only","-","Apr","1","0:00","1:00","D"],["1945","only","-","Apr","16","0:00","1:00","D"],["1945","only","-","Nov","1","2:00","0","S"],["1946","only","-","Apr","16","2:00","1:00","D"],["1946","only","-","Nov","1","0:00","0","S"],["1948","only","-","May","23","0:00","2:00","DD"],["1948","only","-","Sep","1","0:00","1:00","D"],["1948","1949","-","Nov","1","2:00","0","S"],["1949","only","-","May","1","0:00","1:00","D"],["1950","only","-","Apr","16","0:00","1:00","D"],["1950","only","-","Sep","15","3:00","0","S"],["1951","only","-","Apr","1","0:00","1:00","D"],["1951","only","-","Nov","11","3:00","0","S"],["1952","only","-","Apr","20","2:00","1:00","D"],["1952","only","-","Oct","19","3:00","0","S"],["1953","only","-","Apr","12","2:00","1:00","D"],["1953","only","-","Sep","13","3:00","0","S"],["1954","only","-","Jun","13","0:00","1:00","D"],["1954","only","-","Sep","12","0:00","0","S"],["1955","only","-","Jun","11","2:00","1:00","D"],["1955","only","-","Sep","11","0:00","0","S"],["1956","only","-","Jun","3","0:00","1:00","D"],["1956","only","-","Sep","30","3:00","0","S"],["1957","only","-","Apr","29","2:00","1:00","D"],["1957","only","-","Sep","22","0:00","0","S"],["1974","only","-","Jul","7","0:00","1:00","D"],["1974","only","-","Oct","13","0:00","0","S"],["1975","only","-","Apr","20","0:00","1:00","D"],["1975","only","-","Aug","31","0:00","0","S"],["1985","only","-","Apr","14","0:00","1:00","D"],["1985","only","-","Sep","15","0:00","0","S"],["1986","only","-","May","18","0:00","1:00","D"],["1986","only","-","Sep","7","0:00","0","S"],["1987","only","-","Apr","15","0:00","1:00","D"],["1987","only","-","Sep","13","0:00","0","S"],["1988","only","-","Apr","9","0:00","1:00","D"],["1988","only","-","Sep","3","0:00","0","S"],["1989","only","-","Apr","30","0:00","1:00","D"],["1989","only","-","Sep","3","0:00","0","S"],["1990","only","-","Mar","25","0:00","1:00","D"],["1990","only","-","Aug","26","0:00","0","S"],["1991","only","-","Mar","24","0:00","1:00","D"],["1991","only","-","Sep","1","0:00","0","S"],["1992","only","-","Mar","29","0:00","1:00","D"],["1992","only","-","Sep","6","0:00","0","S"],["1993","only","-","Apr","2","0:00","1:00","D"],["1993","only","-","Sep","5","0:00","0","S"],["1994","only","-","Apr","1","0:00","1:00","D"],["1994","only","-","Aug","28","0:00","0","S"],["1995","only","-","Mar","31","0:00","1:00","D"],["1995","only","-","Sep","3","0:00","0","S"],["1996","only","-","Mar","15","0:00","1:00","D"],["1996","only","-","Sep","16","0:00","0","S"],["1997","only","-","Mar","21","0:00","1:00","D"],["1997","only","-","Sep","14","0:00","0","S"],["1998","only","-","Mar","20","0:00","1:00","D"],["1998","only","-","Sep","6","0:00","0","S"],["1999","only","-","Apr","2","2:00","1:00","D"],["1999","only","-","Sep","3","2:00","0","S"],["2000","only","-","Apr","14","2:00","1:00","D"],["2000","only","-","Oct","6","1:00","0","S"],["2001","only","-","Apr","9","1:00","1:00","D"],["2001","only","-","Sep","24","1:00","0","S"],["2002","only","-","Mar","29","1:00","1:00","D"],["2002","only","-","Oct","7","1:00","0","S"],["2003","only","-","Mar","28","1:00","1:00","D"],["2003","only","-","Oct","3","1:00","0","S"],["2004","only","-","Apr","7","1:00","1:00","D"],["2004","only","-","Sep","22","1:00","0","S"],["2005","only","-","Apr","1","2:00","1:00","D"],["2005","only","-","Oct","9","2:00","0","S"],["2006","2010","-","Mar","Fri>=26","2:00","1:00","D"],["2006","only","-","Oct","1","2:00","0","S"],["2007","only","-","Sep","16","2:00","0","S"],["2008","only","-","Oct","5","2:00","0","S"],["2009","only","-","Sep","27","2:00","0","S"],["2010","only","-","Sep","12","2:00","0","S"],["2011","only","-","Apr","1","2:00","1:00","D"],["2011","only","-","Oct","2","2:00","0","S"],["2012","2015","-","Mar","Fri>=26","2:00","1:00","D"],["2012","only","-","Sep","23","2:00","0","S"],["2013","only","-","Sep","8","2:00","0","S"],["2014","only","-","Sep","28","2:00","0","S"],["2015","only","-","Sep","20","2:00","0","S"],["2016","only","-","Apr","1","2:00","1:00","D"],["2016","only","-","Oct","9","2:00","0","S"],["2017","2021","-","Mar","Fri>=26","2:00","1:00","D"],["2017","only","-","Sep","24","2:00","0","S"],["2018","only","-","Sep","16","2:00","0","S"],["2019","only","-","Oct","6","2:00","0","S"],["2020","only","-","Sep","27","2:00","0","S"],["2021","only","-","Sep","12","2:00","0","S"],["2022","only","-","Apr","1","2:00","1:00","D"],["2022","only","-","Oct","2","2:00","0","S"],["2023","2032","-","Mar","Fri>=26","2:00","1:00","D"],["2023","only","-","Sep","24","2:00","0","S"],["2024","only","-","Oct","6","2:00","0","S"],["2025","only","-","Sep","28","2:00","0","S"],["2026","only","-","Sep","20","2:00","0","S"],["2027","only","-","Oct","10","2:00","0","S"],["2028","only","-","Sep","24","2:00","0","S"],["2029","only","-","Sep","16","2:00","0","S"],["2030","only","-","Oct","6","2:00","0","S"],["2031","only","-","Sep","21","2:00","0","S"],["2032","only","-","Sep","12","2:00","0","S"],["2033","only","-","Apr","1","2:00","1:00","D"],["2033","only","-","Oct","2","2:00","0","S"],["2034","2037","-","Mar","Fri>=26","2:00","1:00","D"],["2034","only","-","Sep","17","2:00","0","S"],["2035","only","-","Oct","7","2:00","0","S"],["2036","only","-","Sep","28","2:00","0","S"],["2037","only","-","Sep","13","2:00","0","S"]],"Japan":[["1948","only","-","May","Sun>=1","2:00","1:00","D"],["1948","1951","-","Sep","Sat>=8","2:00","0","S"],["1949","only","-","Apr","Sun>=1","2:00","1:00","D"],["1950","1951","-","May","Sun>=1","2:00","1:00","D"]],"Jordan":[["1973","only","-","Jun","6","0:00","1:00","S"],["1973","1975","-","Oct","1","0:00","0","-"],["1974","1977","-","May","1","0:00","1:00","S"],["1976","only","-","Nov","1","0:00","0","-"],["1977","only","-","Oct","1","0:00","0","-"],["1978","only","-","Apr","30","0:00","1:00","S"],["1978","only","-","Sep","30","0:00","0","-"],["1985","only","-","Apr","1","0:00","1:00","S"],["1985","only","-","Oct","1","0:00","0","-"],["1986","1988","-","Apr","Fri>=1","0:00","1:00","S"],["1986","1990","-","Oct","Fri>=1","0:00","0","-"],["1989","only","-","May","8","0:00","1:00","S"],["1990","only","-","Apr","27","0:00","1:00","S"],["1991","only","-","Apr","17","0:00","1:00","S"],["1991","only","-","Sep","27","0:00","0","-"],["1992","only","-","Apr","10","0:00","1:00","S"],["1992","1993","-","Oct","Fri>=1","0:00","0","-"],["1993","1998","-","Apr","Fri>=1","0:00","1:00","S"],["1994","only","-","Sep","Fri>=15","0:00","0","-"],["1995","1998","-","Sep","Fri>=15","0:00s","0","-"],["1999","only","-","Jul","1","0:00s","1:00","S"],["1999","2002","-","Sep","lastFri","0:00s","0","-"],["2000","2001","-","Mar","lastThu","0:00s","1:00","S"],["2002","max","-","Mar","lastThu","24:00","1:00","S"],["2003","only","-","Oct","24","0:00s","0","-"],["2004","only","-","Oct","15","0:00s","0","-"],["2005","only","-","Sep","lastFri","0:00s","0","-"],["2006","max","-","Oct","lastFri","0:00s","0","-"]],"Kyrgyz":[["1992","1996","-","Apr","Sun>=7","0:00s","1:00","S"],["1992","1996","-","Sep","lastSun","0:00","0","-"],["1997","2005","-","Mar","lastSun","2:30","1:00","S"],["1997","2004","-","Oct","lastSun","2:30","0","-"]],"ROK":[["1960","only","-","May","15","0:00","1:00","D"],["1960","only","-","Sep","13","0:00","0","S"],["1987","1988","-","May","Sun>=8","0:00","1:00","D"],["1987","1988","-","Oct","Sun>=8","0:00","0","S"]],"Lebanon":[["1920","only","-","Mar","28","0:00","1:00","S"],["1920","only","-","Oct","25","0:00","0","-"],["1921","only","-","Apr","3","0:00","1:00","S"],["1921","only","-","Oct","3","0:00","0","-"],["1922","only","-","Mar","26","0:00","1:00","S"],["1922","only","-","Oct","8","0:00","0","-"],["1923","only","-","Apr","22","0:00","1:00","S"],["1923","only","-","Sep","16","0:00","0","-"],["1957","1961","-","May","1","0:00","1:00","S"],["1957","1961","-","Oct","1","0:00","0","-"],["1972","only","-","Jun","22","0:00","1:00","S"],["1972","1977","-","Oct","1","0:00","0","-"],["1973","1977","-","May","1","0:00","1:00","S"],["1978","only","-","Apr","30","0:00","1:00","S"],["1978","only","-","Sep","30","0:00","0","-"],["1984","1987","-","May","1","0:00","1:00","S"],["1984","1991","-","Oct","16","0:00","0","-"],["1988","only","-","Jun","1","0:00","1:00","S"],["1989","only","-","May","10","0:00","1:00","S"],["1990","1992","-","May","1","0:00","1:00","S"],["1992","only","-","Oct","4","0:00","0","-"],["1993","max","-","Mar","lastSun","0:00","1:00","S"],["1993","1998","-","Sep","lastSun","0:00","0","-"],["1999","max","-","Oct","lastSun","0:00","0","-"]],"NBorneo":[["1935","1941","-","Sep","14","0:00","0:20","TS",""],["1935","1941","-","Dec","14","0:00","0","-"]],"Mongol":[["1983","1984","-","Apr","1","0:00","1:00","S"],["1983","only","-","Oct","1","0:00","0","-"],["1985","1998","-","Mar","lastSun","0:00","1:00","S"],["1984","1998","-","Sep","lastSun","0:00","0","-"],["2001","only","-","Apr","lastSat","2:00","1:00","S"],["2001","2006","-","Sep","lastSat","2:00","0","-"],["2002","2006","-","Mar","lastSat","2:00","1:00","S"]],"Pakistan":[["2002","only","-","Apr","Sun>=2","0:01","1:00","S"],["2002","only","-","Oct","Sun>=2","0:01","0","-"],["2008","only","-","Jun","1","0:00","1:00","S"],["2008","only","-","Nov","1","0:00","0","-"],["2009","only","-","Apr","15","0:00","1:00","S"],["2009","only","-","Nov","1","0:00","0","-"]],"EgyptAsia":[["1957","only","-","May","10","0:00","1:00","S"],["1957","1958","-","Oct","1","0:00","0","-"],["1958","only","-","May","1","0:00","1:00","S"],["1959","1967","-","May","1","1:00","1:00","S"],["1959","1965","-","Sep","30","3:00","0","-"],["1966","only","-","Oct","1","3:00","0","-"]],"Palestine":[["1999","2005","-","Apr","Fri>=15","0:00","1:00","S"],["1999","2003","-","Oct","Fri>=15","0:00","0","-"],["2004","only","-","Oct","1","1:00","0","-"],["2005","only","-","Oct","4","2:00","0","-"],["2006","2008","-","Apr","1","0:00","1:00","S"],["2006","only","-","Sep","22","0:00","0","-"],["2007","only","-","Sep","Thu>=8","2:00","0","-"],["2008","only","-","Aug","lastFri","2:00","0","-"],["2009","only","-","Mar","lastFri","0:00","1:00","S"],["2010","max","-","Mar","lastSat","0:01","1:00","S"],["2009","max","-","Sep","Fri>=1","2:00","0","-"],["2010","only","-","Aug","11","0:00","0","-"]],"Phil":[["1936","only","-","Nov","1","0:00","1:00","S"],["1937","only","-","Feb","1","0:00","0","-"],["1954","only","-","Apr","12","0:00","1:00","S"],["1954","only","-","Jul","1","0:00","0","-"],["1978","only","-","Mar","22","0:00","1:00","S"],["1978","only","-","Sep","21","0:00","0","-"]],"Syria":[["1920","1923","-","Apr","Sun>=15","2:00","1:00","S"],["1920","1923","-","Oct","Sun>=1","2:00","0","-"],["1962","only","-","Apr","29","2:00","1:00","S"],["1962","only","-","Oct","1","2:00","0","-"],["1963","1965","-","May","1","2:00","1:00","S"],["1963","only","-","Sep","30","2:00","0","-"],["1964","only","-","Oct","1","2:00","0","-"],["1965","only","-","Sep","30","2:00","0","-"],["1966","only","-","Apr","24","2:00","1:00","S"],["1966","1976","-","Oct","1","2:00","0","-"],["1967","1978","-","May","1","2:00","1:00","S"],["1977","1978","-","Sep","1","2:00","0","-"],["1983","1984","-","Apr","9","2:00","1:00","S"],["1983","1984","-","Oct","1","2:00","0","-"],["1986","only","-","Feb","16","2:00","1:00","S"],["1986","only","-","Oct","9","2:00","0","-"],["1987","only","-","Mar","1","2:00","1:00","S"],["1987","1988","-","Oct","31","2:00","0","-"],["1988","only","-","Mar","15","2:00","1:00","S"],["1989","only","-","Mar","31","2:00","1:00","S"],["1989","only","-","Oct","1","2:00","0","-"],["1990","only","-","Apr","1","2:00","1:00","S"],["1990","only","-","Sep","30","2:00","0","-"],["1991","only","-","Apr","1","0:00","1:00","S"],["1991","1992","-","Oct","1","0:00","0","-"],["1992","only","-","Apr","8","0:00","1:00","S"],["1993","only","-","Mar","26","0:00","1:00","S"],["1993","only","-","Sep","25","0:00","0","-"],["1994","1996","-","Apr","1","0:00","1:00","S"],["1994","2005","-","Oct","1","0:00","0","-"],["1997","1998","-","Mar","lastMon","0:00","1:00","S"],["1999","2006","-","Apr","1","0:00","1:00","S"],["2006","only","-","Sep","22","0:00","0","-"],["2007","only","-","Mar","lastFri","0:00","1:00","S"],["2007","only","-","Nov","Fri>=1","0:00","0","-"],["2008","only","-","Apr","Fri>=1","0:00","1:00","S"],["2008","only","-","Nov","1","0:00","0","-"],["2009","only","-","Mar","lastFri","0:00","1:00","S"],["2010","max","-","Apr","Fri>=1","0:00","1:00","S"],["2009","max","-","Oct","lastFri","0:00","0","-"]]};

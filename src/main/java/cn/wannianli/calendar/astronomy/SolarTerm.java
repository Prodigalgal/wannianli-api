package cn.wannianli.calendar.astronomy;

public enum SolarTerm {
    MINOR_COLD("小寒", 285, 1, 5),
    MAJOR_COLD("大寒", 300, 1, 20),
    START_OF_SPRING("立春", 315, 2, 4),
    RAIN_WATER("雨水", 330, 2, 19),
    AWAKENING_OF_INSECTS("惊蛰", 345, 3, 5),
    SPRING_EQUINOX("春分", 0, 3, 20),
    PURE_BRIGHTNESS("清明", 15, 4, 5),
    GRAIN_RAIN("谷雨", 30, 4, 20),
    START_OF_SUMMER("立夏", 45, 5, 5),
    GRAIN_FULL("小满", 60, 5, 21),
    GRAIN_IN_EAR("芒种", 75, 6, 5),
    SUMMER_SOLSTICE("夏至", 90, 6, 21),
    MINOR_HEAT("小暑", 105, 7, 7),
    MAJOR_HEAT("大暑", 120, 7, 23),
    START_OF_AUTUMN("立秋", 135, 8, 7),
    END_OF_HEAT("处暑", 150, 8, 23),
    WHITE_DEW("白露", 165, 9, 7),
    AUTUMN_EQUINOX("秋分", 180, 9, 23),
    COLD_DEW("寒露", 195, 10, 8),
    FROST_DESCENT("霜降", 210, 10, 23),
    START_OF_WINTER("立冬", 225, 11, 7),
    MINOR_SNOW("小雪", 240, 11, 22),
    MAJOR_SNOW("大雪", 255, 12, 7),
    WINTER_SOLSTICE("冬至", 270, 12, 21);

    private final String chineseName;
    private final double longitude;
    private final int approximateMonth;
    private final int approximateDay;

    SolarTerm(String chineseName, double longitude, int approximateMonth, int approximateDay) {
        this.chineseName = chineseName;
        this.longitude = longitude;
        this.approximateMonth = approximateMonth;
        this.approximateDay = approximateDay;
    }

    public String chineseName() {
        return chineseName;
    }

    public double longitude() {
        return longitude;
    }

    public int approximateMonth() {
        return approximateMonth;
    }

    public int approximateDay() {
        return approximateDay;
    }
}

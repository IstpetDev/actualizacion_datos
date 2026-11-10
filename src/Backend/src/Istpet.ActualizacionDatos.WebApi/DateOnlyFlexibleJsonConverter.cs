namespace Istpet.ActualizacionDatos.WebApi;

using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;

public sealed class DateOnlyFlexibleJsonConverter : JsonConverter<DateOnly>
{
    public override DateOnly Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str)) return default;
            if (DateOnly.TryParse(str, CultureInfo.InvariantCulture, out var dInv)) return dInv;
            if (DateOnly.TryParse(str, out var d)) return d;
            if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
                return DateOnly.FromDateTime(dt);
            if (DateTime.TryParse(str, out var dtLocal))
                return DateOnly.FromDateTime(dtLocal);
            if (str.Length >= 10 && DateOnly.TryParse(str[..10], CultureInfo.InvariantCulture, out var dSub))
                return dSub;
        }

        return DateOnly.FromDateTime(reader.GetDateTime());
    }

    public override void Write(Utf8JsonWriter writer, DateOnly value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
    }
}

public sealed class DateOnlyNullableFlexibleJsonConverter : JsonConverter<DateOnly?>
{
    public override DateOnly? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Null) return null;
        if (reader.TokenType == JsonTokenType.String)
        {
            var str = reader.GetString();
            if (string.IsNullOrWhiteSpace(str)) return null;
            if (DateOnly.TryParse(str, CultureInfo.InvariantCulture, out var dInv)) return dInv;
            if (DateOnly.TryParse(str, out var d)) return d;
            if (DateTime.TryParse(str, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var dt))
                return DateOnly.FromDateTime(dt);
            if (DateTime.TryParse(str, out var dtLocal))
                return DateOnly.FromDateTime(dtLocal);
            if (str.Length >= 10 && DateOnly.TryParse(str[..10], CultureInfo.InvariantCulture, out var dSub))
                return dSub;
        }

        return DateOnly.FromDateTime(reader.GetDateTime());
    }

    public override void Write(Utf8JsonWriter writer, DateOnly? value, JsonSerializerOptions options)
    {
        if (value.HasValue)
            writer.WriteStringValue(value.Value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture));
        else
            writer.WriteNullValue();
    }
}

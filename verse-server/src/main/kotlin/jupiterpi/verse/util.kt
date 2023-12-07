package jupiterpi.verse

import java.util.Random

// see https://stackoverflow.com/a/20536819/13164753
fun randomAlphanumeric(length: Int): String {
    val candidateChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

    val sb = StringBuilder()
    val random = Random()
    for (i in 0 until length) {
        sb.append(
            candidateChars[random.nextInt(
                candidateChars
                    .length
            )]
        )
    }
    return sb.toString()
}
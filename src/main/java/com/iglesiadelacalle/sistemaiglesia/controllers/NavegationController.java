package com.iglesiadelacalle.sistemaiglesia.controllers;

import org.springframework.stereotype.Controller; // Importación necesaria
import org.springframework.web.bind.annotation.GetMapping;

@Controller // ¡Crucial! Le avisa a Spring Boot que esta clase maneja la navegación
public class NavegationController {

    // 1. Ruta para la página principal
    @GetMapping("/")
    public String mostrarIndex() {
        return "index"; 
    }

    // 2. Ruta para la página de Estudios
    @GetMapping("/estudios")
    public String mostrarEstudios() {
        return "Estudios"; 
    }

    // 3. Ruta para la página de Bloques y Tips
    @GetMapping("/bloquesytips")
    public String mostrarBloquesYTips() {
        return "BloquesyTips"; 
    }

    // 4. Ruta para la página de Clases Impartiendo
    @GetMapping("/clasesimpartiendo")
    public String mostrarClasesImpartiendo() {
        return "ClasesImpartiendo"; 
    }   

    // 5. Ruta para la página de Eventos
    @GetMapping("/eventos")
    public String mostrarEventos() {
        return "Eventos"; 
    }

    // 6. Ruta para la página de Ministerios
    @GetMapping("/ministerios")
    public String mostrarMinisterios() {
        return "Ministerios"; 
    }

    // 7. Ruta para la página de Reportes
    @GetMapping("/reportes")
    public String mostrarReportes() {
        return "Reportes"; 
    }

    // 8. Ruta para la página de Servicios
    @GetMapping("/servicios")
    public String mostrarServicios() {
        return "Servicios"; 
    }

    // 9. Ruta para la página de Teologia
    @GetMapping("/teologia")
    public String mostrarTeologia() {
        return "Teologia"; 
    }

    // 10. Ruta para la página de Usuario
    @GetMapping("/usuarios")
    public String mostrarUsuarios() {
        return "Usuarios"; 
    }

    // 11. Ruta para la página de Config. Perfil
    @GetMapping("/configperfil")
    public String mostrarConfigPerfil() {
        return "ConfigPerfil"; 
    }

    // 12. Ruta para la página de Login
    @GetMapping("/login")
    public String mostrarLogin() {
        return "Login"; 
    }

    // 11. Ruta para la página de Config. Perfil
    @GetMapping("/registro")
    public String mostrarRegistro() {
        return "Registro"; 
    }

    //12 ⚡ MAPEADO DE LA VISTA (Para que cargue el HTML)
    @GetMapping("/mis-ministerios")
    public String misMinisterios() {
        return "MisMinisterios"; // El nombre exacto de tu archivo .html sin la extensión
    }

    //13 ⚡ MAPEADO DE LA VISTA (Para que cargue el HTML)
    @GetMapping("/clases-teologia")
    public String clasesTeologia() {
        return "ClasesTeologia"; // El nombre exacto de tu archivo .html sin la extensión
    }

    // 14 ⚡ NUEVA RUTA PARA "MIS BLOQUES"
    @GetMapping("/mis-bloques")
    public String misBloques() {
        return "MisBloques"; 
    }

}
